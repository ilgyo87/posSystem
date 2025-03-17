/**
 * This is a post-push hook for Amplify Gen 2
 * It will update the build settings for the Amplify app after a push
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  console.log('Running post-push hook to update build settings...');
  
  // Get the Amplify app ID from the config
  const appId = 'd3b0lae1kwf0ye';
  
  // Update the build settings to use Node.js 18
  const buildSpecYaml = `
version: 1
applications:
  - frontend:
      phases:
        preBuild:
          commands:
            - nvm use 18
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: build
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
    appRoot: .
  `;
  
  // Create the build settings directory if it doesn't exist
  const buildSettingsDir = path.join(__dirname, '..', 'backend', 'hosting', 'amplifyhosting');
  if (!fs.existsSync(buildSettingsDir)) {
    fs.mkdirSync(buildSettingsDir, { recursive: true });
  }
  
  // Write the build settings file
  fs.writeFileSync(path.join(buildSettingsDir, 'build-spec.yml'), buildSpecYaml);
  
  console.log('Build settings updated successfully!');
} catch (error) {
  console.error('Error updating build settings:', error);
}
