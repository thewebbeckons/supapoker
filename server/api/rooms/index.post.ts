import { db, schema } from "hub:db";
import { z } from "zod";
import {
  CARD_DECK_IDS,
  cardValuesValidationError,
  DEFAULT_CARD_DECK_ID,
  getCardDeckPreset,
  MAX_CARD_VALUE_LENGTH,
  MAX_CARD_VALUES,
  MIN_CARD_VALUES,
} from "~/utils/card-decks";

const createRoomSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(500).nullable().optional(),
  displayName: z.string().trim().min(2).max(80).optional(),
  turnstileToken: z.string().min(1).optional(),
  cardDeckId: z.enum(CARD_DECK_IDS).default(DEFAULT_CARD_DECK_ID),
  cardValues: z.array(z.string().trim().min(1).max(MAX_CARD_VALUE_LENGTH))
    .min(MIN_CARD_VALUES)
    .max(MAX_CARD_VALUES)
    .optional(),
}).superRefine((value, context) => {
  if (value.cardDeckId !== "custom") return;

  const error = cardValuesValidationError(value.cardValues ?? []);
  if (error) {
    context.addIssue({ code: "custom", path: ["cardValues"], message: error });
  }
});

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event);
  const body = await readValidatedBody(event, createRoomSchema.parse);
  const now = new Date();
  const roomId = crypto.randomUUID();
  const cardValues = body.cardDeckId === "custom"
    ? body.cardValues!
    : [...(getCardDeckPreset(body.cardDeckId)?.values ?? [])];
  const anonymous = isAnonymousAppUser(user);

  if (anonymous) {
    const existingRoomId = await getGuestOwnedRoomId(user.id);
    if (existingRoomId) {
      throw createError({
        statusCode: 409,
        message: "Guests can create one active room. Create an account to make more.",
        data: { code: "GUEST_ROOM_LIMIT", roomId: existingRoomId },
      });
    }

    const displayName = await resolveGuestDisplayName(user.id, body.displayName);
    if (!displayName) {
      throw createError({ statusCode: 400, message: "Display name is required." });
    }
    if (!body.turnstileToken) {
      throw createError({
        statusCode: 403,
        message: "Please complete the security check.",
        data: { code: "TURNSTILE_FAILED" },
      });
    }
    await verifyGuestRoomCreation(event, body.turnstileToken);

    let createdRooms: (typeof schema.rooms.$inferSelect)[];
    try {
      const results = await db.batch([
        db.insert(schema.profiles).values({
          userId: user.id,
          name: displayName,
          lastActiveAt: now,
          createdAt: now,
          updatedAt: now,
        }).onConflictDoUpdate({
          target: schema.profiles.userId,
          set: { name: displayName, lastActiveAt: now, updatedAt: now },
        }),
        db.insert(schema.rooms).values({
          id: roomId,
          name: body.name,
          description: body.description?.trim() || null,
          adminUserId: user.id,
          cardDeckId: body.cardDeckId,
          cardValues: JSON.stringify(cardValues),
          createdAt: now,
          updatedAt: now,
        }).returning(),
        db.insert(schema.roomParticipants).values({ roomId, userId: user.id, joinedAt: now }),
        db.insert(schema.guestRoomOwnerships).values({ userId: user.id, roomId, createdAt: now }),
      ]);
      createdRooms = results[1];
    } catch (error) {
      const existingRoomId = await getGuestOwnedRoomId(user.id);
      if (existingRoomId) {
        throw createError({
          statusCode: 409,
          message: "Guests can create one active room. Create an account to make more.",
          data: { code: "GUEST_ROOM_LIMIT", roomId: existingRoomId },
        });
      }
      throw error;
    }

    const [room] = createdRooms;
    if (!room) throw createError({ statusCode: 500, message: "Unable to create room." });

    const posthog = useServerPostHog();
    const sessionId = getHeader(event, "x-posthog-session-id");
    const distinctId = getHeader(event, "x-posthog-distinct-id") || user.id;
    posthog.capture({
      distinctId,
      event: "server_room_created",
      properties: { $session_id: sessionId, room_id: roomId, card_deck_id: body.cardDeckId, is_guest: true },
    });
    await posthog.flush();

    await syncRoomSession(event, roomId);
    setResponseStatus(event, 201);
    return mapRoom(room);
  }

  const [createdRooms] = await db.batch([
    db
      .insert(schema.rooms)
      .values({
        id: roomId,
        name: body.name,
        description: body.description?.trim() || null,
        adminUserId: user.id,
        cardDeckId: body.cardDeckId,
        cardValues: JSON.stringify(cardValues),
        createdAt: now,
        updatedAt: now,
      })
      .returning(),
    db.insert(schema.roomParticipants).values({
      roomId,
      userId: user.id,
      joinedAt: now,
    }),
  ]);

  const [room] = createdRooms;

  if (!room) {
    throw createError({ statusCode: 500, message: "Unable to create room." });
  }

  const posthog = useServerPostHog();
  const sessionId = getHeader(event, "x-posthog-session-id");
  const distinctId = getHeader(event, "x-posthog-distinct-id") || user.id;
  posthog.capture({
    distinctId,
    event: "server_room_created",
    properties: { $session_id: sessionId, room_id: roomId, card_deck_id: body.cardDeckId, is_guest: false },
  });
  await posthog.flush();

  await syncRoomSession(event, roomId);

  setResponseStatus(event, 201);
  return mapRoom(room);
});
