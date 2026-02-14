import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import { RootState } from '../store';
import {
  loginStart,
  loginSuccess,
  loginFailure,
  logout as logoutAction,
  clearError,
  updateUser,
} from '../store/slices/authSlice';
import { ApiService } from '../services/api';
import { LoginCredentials, UserRegistration, AuthResponse } from '../types';
import { toast } from 'react-toastify';

export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, token, isAuthenticated, isLoading, error } = useSelector(
    (state: RootState) => state.auth
  );

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      dispatch(loginStart());
      
      const response = await ApiService.post<AuthResponse>('/users/login', credentials);
      
      dispatch(loginSuccess(response));
      toast.success('Login successful!');
      return response;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      dispatch(loginFailure(errorMessage));
      toast.error(errorMessage);
      throw error;
    }
  }, [dispatch]);

  const registerUser = useCallback(async (userData: UserRegistration) => {
    try {
      dispatch(loginStart());
      
      const formData = new FormData();
      formData.append('user', JSON.stringify({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: userData.role,
      }));
      
      if (userData.resume) {
        formData.append('resume', userData.resume);
      }
      
      if (userData.aadhaar) {
        formData.append('aadhaar', userData.aadhaar);
      }
      
      const response = await ApiService.upload<AuthResponse>('/users/register', formData);
      
      dispatch(loginSuccess(response));
      toast.success('Registration successful!');
      return response;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      dispatch(loginFailure(errorMessage));
      toast.error(errorMessage);
      throw error;
    }
  }, [dispatch]);

  const registerInvestor = useCallback(async (investorData: any) => {
    try {
      dispatch(loginStart());
      
      const formData = new FormData();
      formData.append('investor', JSON.stringify({
        name: investorData.name,
        email: investorData.email,
        password: investorData.password,
        totalInvestment: investorData.totalInvestment,
      }));
      
      if (investorData.panCard) {
        formData.append('panCard', investorData.panCard);
      }
      
      const response = await ApiService.upload<AuthResponse>('/investors/register', formData);
      
      dispatch(loginSuccess(response));
      toast.success('Investor registration successful!');
      return response;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Investor registration failed';
      dispatch(loginFailure(errorMessage));
      toast.error(errorMessage);
      throw error;
    }
  }, [dispatch]);

  const logout = useCallback(() => {
    dispatch(logoutAction());
    toast.success('Logged out successfully');
  }, [dispatch]);

  const updateProfile = useCallback(async (userData: Partial<UserRegistration>) => {
    try {
      if (!user) throw new Error('No user logged in');
      
      const response = await ApiService.put(`/users/profile/${user.id}`, userData);
      dispatch(updateUser(response));
      toast.success('Profile updated successfully!');
      return response;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Profile update failed';
      toast.error(errorMessage);
      throw error;
    }
  }, [dispatch, user]);

  const clearAuthError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const hasRole = useCallback((role: string) => {
    return user?.role === role;
  }, [user]);

  const hasAnyRole = useCallback((roles: string[]) => {
    return user?.role ? roles.includes(user.role) : false;
  }, [user]);

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login,
    registerUser,
    registerInvestor,
    logout,
    updateProfile,
    clearAuthError,
    hasRole,
    hasAnyRole,
  };
};
