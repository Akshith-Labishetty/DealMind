import mongoose from 'mongoose';
import { config } from './config.js';

let state = { connected: false, message: 'not connected' };

export async function connectDB() {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 });
    state = { connected: true, message: 'connected' };
    mongoose.connection.on('error', (e) => {
      state = { connected: false, message: e.message };
    });
    mongoose.connection.on('disconnected', () => {
      state = { connected: false, message: 'disconnected' };
    });
    return true;
  } catch (e) {
    state = { connected: false, message: e.message };
    return false;
  }
}

export function dbStatus() {
  return { ...state, readyState: mongoose.connection.readyState };
}
