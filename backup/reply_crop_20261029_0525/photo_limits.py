"""Per-member profile photo slot limits (shared by set_profile_photo / save_omoide_mail)."""
DEFAULT_LIMIT = 4
PHOTO_LIMIT = {
  'エイジ': 10,
  'ゆず': 10,
  'ゆず💖': 10,
}
def photo_limit(name: str) -> int:
  if not name: return DEFAULT_LIMIT
  if name in PHOTO_LIMIT: return PHOTO_LIMIT[name]
  # plain name without emoji
  import re
  plain = re.sub(r'[^\w・ー]', '', name) or name
  return PHOTO_LIMIT.get(plain, DEFAULT_LIMIT)
