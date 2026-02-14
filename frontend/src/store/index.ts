import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import usersReducer from './slices/usersSlice';
import coursesReducer from './slices/coursesSlice';
import chatsReducer from './slices/chatsSlice';
import paymentsReducer from './slices/paymentsSlice';
import jobsReducer from './slices/jobsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: usersReducer,
    courses: coursesReducer,
    chats: chatsReducer,
    payments: paymentsReducer,
    jobs: jobsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
