# Publish on NPM

echo "Publishing to NPM"

# Get correct version from repository tag
version=${CI_COMMIT_REF_NAME/-release/}
versionNumber="${version//v}"

sed -i -e "s/.*version.*/\"version\": \"$versionNumber\",/" package.json

npm install npm-cli-login
node ./node_modules/npm-cli-login/bin/npm-cli-login.js -u "$NPM_USER" -p "$NPM_PASSWORD" -e "$NPM_MAIL" -r "https://registry.npmjs.org"
sleep 20s
npm publish

# Publish on Github
touch .npmrc
echo "//npm.pkg.github.com/:_authToken=$GITHUB_PAT" >> .npmrc
echo "@hybrix-io:registry=https://npm.pkg.github.com" >> .npmrc

sed -i -e "\$i \,\"publishConfig\": { \"registry\": \"https://npm.pkg.github.com/\" }" package.json

npm publish
