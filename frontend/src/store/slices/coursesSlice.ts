import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Course, PaginatedResponse, CourseFilters } from '../../types';

interface CoursesState {
  courses: Course[];
  currentCourse: Course | null;
  userCourses: Course[];
  categories: string[];
  providers: string[];
  pagination: {
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
  };
  filters: CourseFilters;
  isLoading: boolean;
  error: string | null;
}

const initialState: CoursesState = {
  courses: [],
  currentCourse: null,
  userCourses: [],
  categories: [],
  providers: [],
  pagination: {
    totalElements: 0,
    totalPages: 0,
    size: 20,
    number: 0,
    first: true,
    last: true,
  },
  filters: {},
  isLoading: false,
  error: null,
};

const coursesSlice = createSlice({
  name: 'courses',
  initialState,
  reducers: {
    fetchCoursesStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchCoursesSuccess: (state, action: PayloadAction<PaginatedResponse<Course>>) => {
      state.isLoading = false;
      state.courses = action.payload.data;
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
    fetchCoursesFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    fetchCourseByIdStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchCourseByIdSuccess: (state, action: PayloadAction<Course>) => {
      state.isLoading = false;
      state.currentCourse = action.payload;
      state.error = null;
    },
    fetchCourseByIdFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    requestCourseStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    requestCourseSuccess: (state, action: PayloadAction<Course>) => {
      state.isLoading = false;
      state.courses.unshift(action.payload);
      state.error = null;
    },
    requestCourseFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    fetchUserCoursesSuccess: (state, action: PayloadAction<Course[]>) => {
      state.userCourses = action.payload;
    },
    fetchCategoriesSuccess: (state, action: PayloadAction<string[]>) => {
      state.categories = action.payload;
    },
    fetchProvidersSuccess: (state, action: PayloadAction<string[]>) => {
      state.providers = action.payload;
    },
    updateCourseSuccess: (state, action: PayloadAction<Course>) => {
      const index = state.courses.findIndex(course => course.id === action.payload.id);
      if (index !== -1) {
        state.courses[index] = action.payload;
      }
      if (state.currentCourse && state.currentCourse.id === action.payload.id) {
        state.currentCourse = action.payload;
      }
    },
    deleteCourseSuccess: (state, action: PayloadAction<string>) => {
      state.courses = state.courses.filter(course => course.id !== action.payload);
      if (state.currentCourse && state.currentCourse.id === action.payload) {
        state.currentCourse = null;
      }
    },
    setFilters: (state, action: PayloadAction<CourseFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchCoursesStart,
  fetchCoursesSuccess,
  fetchCoursesFailure,
  fetchCourseByIdStart,
  fetchCourseByIdSuccess,
  fetchCourseByIdFailure,
  requestCourseStart,
  requestCourseSuccess,
  requestCourseFailure,
  fetchUserCoursesSuccess,
  fetchCategoriesSuccess,
  fetchProvidersSuccess,
  updateCourseSuccess,
  deleteCourseSuccess,
  setFilters,
  clearFilters,
  clearError,
} = coursesSlice.actions;

export default coursesSlice.reducer;
