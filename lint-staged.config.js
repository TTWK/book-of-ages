export default {
  '*.{ts,js,vue}': ['prettier --write', 'eslint --fix'],
  '*.{json,md,yml,yaml}': ['prettier --write'],
};
