import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../api/axiosInstance';

export function useBaseline(projectId) {
  return useQuery({
    queryKey: ['baseline', projectId],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/projects/${projectId}/baseline/`);
      return data.data;
    },
    // Don't retry 404s since it means baseline hasn't been generated
    retry: (failureCount, error) => {
      if (error.response?.status === 404) return false;
      return failureCount < 3;
    },
    enabled: !!projectId,
  });
}

export function useGenerateBaseline(projectId) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { data } = await axiosInstance.post(`/projects/${projectId}/generate-baseline/`);
      return data.data;
    },
    onSuccess: () => {
      // Invalidate baseline query to trigger loading state updates if needed
      queryClient.invalidateQueries({ queryKey: ['baseline', projectId] });
    }
  });
}

export function useTaskStatus(taskId) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/tasks/${taskId}/`);
      return data.data;
    },
    // Only poll if we have a taskId
    enabled: !!taskId,
    // Poll every 3 seconds
    refetchInterval: (query) => {
      // Stop polling once task succeeds or fails
      const status = query.state?.data?.status;
      if (status === 'complete' || status === 'SUCCESS' || status === 'failed' || status === 'FAILURE') {
        return false;
      }
      return 3000;
    },
  });
}
