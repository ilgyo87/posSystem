import { defineBackend } from '@aws-amplify/backend';
import { auth } from './amplify/auth/resource';
import { data } from './amplify/data/resource';

/**
 * Amplify Gen 2 configuration for React Native POS System
 * @see https://docs.amplify.aws/gen2/deploy-and-host/deploy/
 */
export const backend = defineBackend({
  auth,
  data
});
