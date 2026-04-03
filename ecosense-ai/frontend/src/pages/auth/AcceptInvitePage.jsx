import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams, Link } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import axios from 'axios';

const acceptInviteSchema = z.object({
  full_name: z.string().min(2, { message: 'Full name is required' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
  confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});

export default function AcceptInvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [apiError, setApiError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(acceptInviteSchema),
  });

  const onSubmit = async (data) => {
    setApiError(null);
    try {
      const response = await axios.post(`/api/v1/auth/accept-invite/${token}/`, data);
      
      const { user, access_token, refresh_token } = response.data.data;
      
      setAuth(user, access_token);
      localStorage.setItem('refresh_token', refresh_token);
      
      navigate('/dashboard');
    } catch (error) {
      if (error.response?.data?.error?.message) {
        setApiError(error.response.data.error.message);
      } else if (error.response?.status === 404) {
        setApiError("This invitation link is invalid or does not exist.");
      } else if (error.response?.status === 400) {
        setApiError("This invitation has expired or has already been used.");
      } else {
        setApiError('An error occurred. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h1 className="text-4xl font-extrabold text-white mb-2">EcoSense AI</h1>
        <p className="text-green-300">Join your organisation's workspace</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10 border border-green-100">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            
            {apiError && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                <p className="text-sm text-red-700">{apiError}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <div className="mt-1">
                <input
                  {...register('full_name')}
                  type="text"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                />
                {errors.full_name && <p className="mt-1 text-sm text-red-600">{errors.full_name.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Set Password</label>
              <div className="mt-1">
                <input
                  {...register('password')}
                  type="password"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                />
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
              <div className="mt-1">
                <input
                  {...register('confirm_password')}
                  type="password"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                />
                {errors.confirm_password && <p className="mt-1 text-sm text-red-600">{errors.confirm_password.message}</p>}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {isSubmitting ? 'Joining...' : 'Accept Invitation'}
              </button>
            </div>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              <Link to="/login" className="font-medium text-green-600 hover:text-green-500">
                Back to Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
