import { defineAuth } from "@aws-amplify/backend"

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true
  },
  // Remove custom user attributes for now to fix deployment error
  multifactor: {
    mode: "OPTIONAL",
    sms: true
  }
})
