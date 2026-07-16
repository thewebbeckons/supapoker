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
  name: z.string().min(1).max(120),
  description: z.string().max(500).nullable().optional(),
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

  const [createdRooms] = await db.batch([
    db
      .insert(schema.rooms)
      .values({
        id: roomId,
        name: body.name.trim(),
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

  await syncRoomSession(event, roomId);

  setResponseStatus(event, 201);
  return mapRoom(room);
});
