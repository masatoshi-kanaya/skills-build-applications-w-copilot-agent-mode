import { Schema, model } from 'mongoose';

const workoutSchema = new Schema({
  title: { type: String, trim: true, maxlength: 100 },
  focus: { type: String, required: true, trim: true, maxlength: 100 },
  minutes: { type: Number, required: true, min: 1, max: 1440 },
  difficulty: { type: String, required: true, trim: true, maxlength: 50 },
});

export const Workout = model('Workout', workoutSchema);
