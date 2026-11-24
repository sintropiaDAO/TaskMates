// Mirrors NotificationsPanel routing so a phone tap opens the same item as a tap in the app.
export function pushUrlFor(type: string, userId: string, ref: string | null, conversationId: string | null): string {
  if (type.includes("message")) return conversationId ? `/chat?conversation=${conversationId}` : "/chat";
  if (type === "new_follower") return `/profile/${userId}/followers`;
  if (ref && (type.startsWith("poll") || type === "new_vote")) return `/dashboard?poll=${ref}`;
  if (ref && (type.startsWith("product") || type === "delivery_confirmed")) return `/dashboard?product=${ref}`;
  if (["rating", "new_rating", "vouch", "new_vouch"].includes(type)) return `/profile/${userId}`;
  return ref ? `/dashboard?task=${ref}` : "/dashboard";
}
