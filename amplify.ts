import { defineBackend } from '@aws-amplify/backend';
import { auth } from './amplify/auth/resource';
import { data } from './amplify/data/resource';

/**
 * Define your Amplify backend
 * @see https://docs.amplify.aws/gen2/build-a-backend/
 */
export const backend = defineBackend({
  auth,
  data
});
