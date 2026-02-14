import { useState, useEffect, useCallback } from 'react';
import { ApiService, handleApiError } from '../services/api';

interface UseApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

interface UseApiOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export const useApi = <T = any>(
  apiCall: () => Promise<T>,
  options: UseApiOptions = {}
) => {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    isLoading: false,
    error: null,
  });

  const execute = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const result = await apiCall();
      
      setState({
        data: result,
        isLoading: false,
        error: null,
      });
      
      if (options.onSuccess) {
        options.onSuccess(result);
      }
      
      return result;
    } catch (error: any) {
      const errorMessage = handleApiError(error);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      
      if (options.onError) {
        options.onError(errorMessage);
      }
      
      throw error;
    }
  }, [apiCall, options]);

  useEffect(() => {
    if (options.immediate) {
      execute();
    }
  }, [execute, options.immediate]);

  const reset = useCallback(() => {
    setState({
      data: null,
      isLoading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
};

// Specific API hooks for common patterns
export const useGetApi = <T = any>(
  url: string,
  params?: any,
  options: UseApiOptions = {}
) => {
  return useApi<T>(
    () => ApiService.get<T>(url, params),
    { ...options, immediate: true }
  );
};

export const usePostApi = <T = any>(
  url: string,
  data?: any,
  options: UseApiOptions = {}
) => {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    isLoading: false,
    error: null,
  });

  const execute = useCallback(async (postData?: any) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const result = await ApiService.post<T>(url, postData || data);
      
      setState({
        data: result,
        isLoading: false,
        error: null,
      });
      
      if (options.onSuccess) {
        options.onSuccess(result);
      }
      
      return result;
    } catch (error: any) {
      const errorMessage = handleApiError(error);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      
      if (options.onError) {
        options.onError(errorMessage);
      }
      
      throw error;
    }
  }, [url, data, options]);

  return {
    ...state,
    execute,
  };
};

export const usePaginatedApi = <T = any>(
  url: string,
  initialParams: any = {},
  options: UseApiOptions = {}
) => {
  const [state, setState] = useState<UseApiState<{
    data: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
  }>>({
    data: null,
    isLoading: false,
    error: null,
  });

  const [params, setParams] = useState(initialParams);

  const execute = useCallback(async (newParams?: any) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const finalParams = { ...params, ...newParams };
      const result = await ApiService.get(url, finalParams);
      
      setState({
        data: result,
        isLoading: false,
        error: null,
      });
      
      if (options.onSuccess) {
        options.onSuccess(result);
      }
      
      return result;
    } catch (error: any) {
      const errorMessage = handleApiError(error);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      
      if (options.onError) {
        options.onError(errorMessage);
      }
      
      throw error;
    }
  }, [url, params, options]);

  useEffect(() => {
    if (options.immediate !== false) {
      execute();
    }
  }, [execute, options.immediate]);

  const updateParams = useCallback((newParams: any) => {
    setParams(prev => ({ ...prev, ...newParams }));
  }, []);

  const reset = useCallback(() => {
    setState({
      data: null,
      isLoading: false,
      error: null,
    });
    setParams(initialParams);
  }, [initialParams]);

  return {
    ...state,
    execute,
    updateParams,
    reset,
    params,
  };
};

export const useFileUpload = (url: string, options: UseApiOptions = {}) => {
  const [state, setState] = useState<UseApiState<any>>({
    data: null,
    isLoading: false,
    error: null,
  });
  const [progress, setProgress] = useState(0);

  const upload = useCallback(async (file: File, additionalData?: Record<string, any>) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      setProgress(0);

      const formData = new FormData();
      formData.append('file', file);
      
      if (additionalData) {
        Object.entries(additionalData).forEach(([key, value]) => {
          formData.append(key, value as string);
        });
      }

      const result = await ApiService.upload(url, formData, (progressValue) => {
        setProgress(progressValue);
      });

      setState({
        data: result,
        isLoading: false,
        error: null,
      });

      if (options.onSuccess) {
        options.onSuccess(result);
      }

      return result;
    } catch (error: any) {
      const errorMessage = handleApiError(error);

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      if (options.onError) {
        options.onError(errorMessage);
      }

      throw error;
    }
  }, [url, options]);

  const reset = useCallback(() => {
    setState({
      data: null,
      isLoading: false,
      error: null,
    });
    setProgress(0);
  }, []);

  return {
    ...state,
    upload,
    progress,
    reset,
  };
};
