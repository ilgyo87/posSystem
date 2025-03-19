import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';

// Create a client that can be used throughout the app
export const client = generateClient<Schema>();
