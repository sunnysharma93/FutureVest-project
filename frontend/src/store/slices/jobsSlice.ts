import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Job, PaginatedResponse, JobFilters } from '../../types';

interface JobsState {
  jobs: Job[];
  currentJob: Job | null;
  postedJobs: Job[];
  appliedJobs: Job[];
  savedJobs: Job[];
  categories: string[];
  locations: string[];
  companies: string[];
  pagination: {
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
  };
  filters: JobFilters;
  isLoading: boolean;
  isPosting: boolean;
  error: string | null;
}

const initialState: JobsState = {
  jobs: [],
  currentJob: null,
  postedJobs: [],
  appliedJobs: [],
  savedJobs: [],
  categories: [],
  locations: [],
  companies: [],
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
  isPosting: false,
  error: null,
};

const jobsSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    fetchJobsStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchJobsSuccess: (state, action: PayloadAction<PaginatedResponse<Job>>) => {
      state.isLoading = false;
      state.jobs = action.payload.data;
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
    fetchJobsFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    fetchJobByIdStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchJobByIdSuccess: (state, action: PayloadAction<Job>) => {
      state.isLoading = false;
      state.currentJob = action.payload;
      state.error = null;
    },
    fetchJobByIdFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    postJobStart: (state) => {
      state.isPosting = true;
      state.error = null;
    },
    postJobSuccess: (state, action: PayloadAction<Job>) => {
      state.isPosting = false;
      state.postedJobs.unshift(action.payload);
      state.jobs.unshift(action.payload);
      state.error = null;
    },
    postJobFailure: (state, action: PayloadAction<string>) => {
      state.isPosting = false;
      state.error = action.payload;
    },
    updateJobSuccess: (state, action: PayloadAction<Job>) => {
      const index = state.jobs.findIndex(job => job.id === action.payload.id);
      if (index !== -1) {
        state.jobs[index] = action.payload;
      }
      if (state.currentJob && state.currentJob.id === action.payload.id) {
        state.currentJob = action.payload;
      }
      const postedIndex = state.postedJobs.findIndex(job => job.id === action.payload.id);
      if (postedIndex !== -1) {
        state.postedJobs[postedIndex] = action.payload;
      }
    },
    deleteJobSuccess: (state, action: PayloadAction<string>) => {
      state.jobs = state.jobs.filter(job => job.id !== action.payload);
      state.postedJobs = state.postedJobs.filter(job => job.id !== action.payload);
      if (state.currentJob && state.currentJob.id === action.payload) {
        state.currentJob = null;
      }
    },
    applyToJob: (state, action: PayloadAction<string>) => {
      const jobId = action.payload;
      if (!state.appliedJobs.find(job => job.id === jobId)) {
        const job = state.jobs.find(j => j.id === jobId);
        if (job) {
          state.appliedJobs.push(job);
        }
      }
    },
    saveJob: (state, action: PayloadAction<string>) => {
      const jobId = action.payload;
      if (!state.savedJobs.find(job => job.id === jobId)) {
        const job = state.jobs.find(j => j.id === jobId);
        if (job) {
          state.savedJobs.push(job);
        }
      }
    },
    unsaveJob: (state, action: PayloadAction<string>) => {
      const jobId = action.payload;
      state.savedJobs = state.savedJobs.filter(job => job.id !== jobId);
    },
    fetchPostedJobsSuccess: (state, action: PayloadAction<Job[]>) => {
      state.postedJobs = action.payload;
    },
    fetchAppliedJobsSuccess: (state, action: PayloadAction<Job[]>) => {
      state.appliedJobs = action.payload;
    },
    fetchSavedJobsSuccess: (state, action: PayloadAction<Job[]>) => {
      state.savedJobs = action.payload;
    },
    fetchCategoriesSuccess: (state, action: PayloadAction<string[]>) => {
      state.categories = action.payload;
    },
    fetchLocationsSuccess: (state, action: PayloadAction<string[]>) => {
      state.locations = action.payload;
    },
    fetchCompaniesSuccess: (state, action: PayloadAction<string[]>) => {
      state.companies = action.payload;
    },
    setFilters: (state, action: PayloadAction<JobFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearError: (state) => {
      state.error = null;
    },
    clearPostedJobs: (state) => {
      state.postedJobs = [];
    },
    clearAppliedJobs: (state) => {
      state.appliedJobs = [];
    },
    clearSavedJobs: (state) => {
      state.savedJobs = [];
    },
  },
});

export const {
  fetchJobsStart,
  fetchJobsSuccess,
  fetchJobsFailure,
  fetchJobByIdStart,
  fetchJobByIdSuccess,
  fetchJobByIdFailure,
  postJobStart,
  postJobSuccess,
  postJobFailure,
  updateJobSuccess,
  deleteJobSuccess,
  applyToJob,
  saveJob,
  unsaveJob,
  fetchPostedJobsSuccess,
  fetchAppliedJobsSuccess,
  fetchSavedJobsSuccess,
  fetchCategoriesSuccess,
  fetchLocationsSuccess,
  fetchCompaniesSuccess,
  setFilters,
  clearFilters,
  clearError,
  clearPostedJobs,
  clearAppliedJobs,
  clearSavedJobs,
} = jobsSlice.actions;

export default jobsSlice.reducer;
