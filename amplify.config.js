/**
 * Amplify Gen 2 configuration for React Native
 * @see https://docs.amplify.aws/gen2/deploy-and-host/deploy/
 */
module.exports = {
  name: 'posSystem',
  version: 2,
  appId: 'd3b0lae1kwf0ye',
  frontend: {
    framework: 'react-native',
    config: {
      SourceDir: 'src',
      DistributionDir: '/',
      BuildCommand: 'npm run build',
      StartCommand: 'npm start'
    }
  },
  backend: {
    deploymentBranch: 'main'
  },
  hosting: {
    amplifyhosting: {
      environment: {
        variables: {
          _LIVE_UPDATES: '[{"name":"Node.js","pkg":"node","type":"nvm","version":"18"}]'
        }
      }
    }
  },
  build: {
    buildspec: {
      phases: {
        preBuild: {
          commands: [
            'nvm use 18',
            'npm ci'
          ]
        },
        build: {
          commands: [
            'npm run build'
          ]
        }
      },
      artifacts: {
        baseDirectory: 'build',
        files: [
          '**/*'
        ]
      },
      cache: {
        paths: [
          'node_modules/**/*'
        ]
      }
    }
  }
};
