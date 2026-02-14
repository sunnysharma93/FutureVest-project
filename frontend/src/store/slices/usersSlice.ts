import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User, PaginatedResponse } from '../../types';

interface UsersState {
  users: User[];
  currentUser: User | null;
  pagination: {
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
  };
  isLoading: boolean;
  error: string | null;
}

const initialState: UsersState = {
  users: [],
  currentUser: null,
  pagination: {
    totalElements: 0,
    totalPages: 0,
    size: 20,
    number: 0,
    first: true,
    last: true,
  },
  isLoading: false,
  error: null,
};

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    fetchUsersStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchUsersSuccess: (state, action: PayloadAction<PaginatedResponse<User>>) => {
      state.isLoading = false;
      state.users = action.payload.data;
      state.pagination = {
        totalElements: action.payload.totalElements,
        totalPages: action.payload.totalPages,
        size: action.payload.size,
        number: action.payload.number,
        first: action.payload.first,
        last: action.payload.last,
      };
      state.error = null;
    },
    fetchUsersFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    fetchUserByIdStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchUserByIdSuccess: (state, action: PayloadAction<User>) => {
      state.isLoading = false;
      state.currentUser = action.payload;
      state.error = null;
    },
    fetchUserByIdFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    updateUserSuccess: (state, action: PayloadAction<User>) => {
      const index = state.users.findIndex(user => user.id === action.payload.id);
      if (index !== -1) {
        state.users[index] = action.payload;
      }
      if (state.currentUser && state.currentUser.id === action.payload.id) {
        state.currentUser = action.payload;
      }
    },
    deleteUserSuccess: (state, action: PayloadAction<string>) => {
      state.users = state.users.filter(user => user.id !== action.payload);
      if (state.currentUser && state.currentUser.id === action.payload) {
        state.currentUser = null;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchUsersStart,
  fetchUsersSuccess,
  fetchUsersFailure,
  fetchUserByIdStart,
  fetchUserByIdSuccess,
  fetchUserByIdFailure,
  updateUserSuccess,
  deleteUserSuccess,
  clearError,
} = usersSlice.actions;

export default usersSlice.reducer;
