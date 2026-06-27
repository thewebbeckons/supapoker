import { toWebRequest } from "h3";

export default defineEventHandler((event) => {
  return createAuth(event).handler(toWebRequest(event));
});
