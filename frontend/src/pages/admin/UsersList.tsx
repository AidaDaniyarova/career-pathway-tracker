import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';

interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  created_at: string;
}

interface NewUserData {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_active: boolean;
}

const UsersList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [newUser, setNewUser] = useState<NewUserData>({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    is_staff: false,
    is_active: true,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Calling adminAPI.getUsers()...');
      const response = await adminAPI.getUsers();
      console.log('Response received:', response);
      console.log('Users data:', response.data);

      // Handle both array response and paginated response
      const usersData = Array.isArray(response.data) ? response.data : response.data.results || [];
      setUsers(usersData);
    } catch (err: any) {
      console.error('Failed to load users - Full error:', err);
      console.error('Error response:', err.response);
      console.error('Error message:', err.message);

      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else if (err.response?.status === 404) {
        setError('API endpoint not found. Please check if the backend is running.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load users');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    // Validate form
    if (!newUser.username || !newUser.email || !newUser.password) {
      setFormError('Username, email, and password are required.');
      return;
    }

    if (newUser.password !== newUser.password_confirm) {
      setFormError('Passwords do not match.');
      return;
    }

    if (newUser.password.length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await adminAPI.createUser({
        username: newUser.username,
        email: newUser.email,
        password: newUser.password,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        is_staff: newUser.is_staff,
        is_active: newUser.is_active,
      });

      // Reset form and close modal
      setNewUser({
        username: '',
        email: '',
        password: '',
        password_confirm: '',
        first_name: '',
        last_name: '',
        is_staff: false,
        is_active: true,
      });
      setShowAddModal(false);

      // Refresh user list
      await fetchUsers();
    } catch (err: any) {
      console.error('Failed to create user:', err);
      const errorData = err.response?.data;
      if (typeof errorData === 'object') {
        const errors = Object.values(errorData).flat().join(', ');
        setFormError(errors || 'Failed to create user');
      } else {
        setFormError(errorData?.message || 'Failed to create user');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleUserStatus = async (userId: string) => {
    try {
      await adminAPI.toggleUserActive(userId);
      await fetchUsers();
    } catch (err) {
      console.error('Failed to toggle user status:', err);
      alert('Failed to update user status');
    }
  };

  const toggleAdminStatus = async (userId: string) => {
    try {
      await adminAPI.toggleUserStaff(userId);
      await fetchUsers();
    } catch (err) {
      console.error('Failed to toggle admin status:', err);
      alert('Failed to update admin status');
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (window.confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      try {
        await adminAPI.deleteUser(userId);
        await fetchUsers();
      } catch (err) {
        console.error('Failed to delete user:', err);
        alert('Failed to delete user');
      }
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">Loading users...</div>
        <div className="text-xs text-gray-400 mt-2">Checking API connection...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={fetchUsers}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add User
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.username}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {user.first_name} {user.last_name}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.is_superuser ? 'bg-purple-100 text-purple-800' :
                      user.is_staff ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {user.is_superuser ? 'Superuser' : user.is_staff ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 space-x-2">
                    <button
                      onClick={() => toggleUserStatus(user.id)}
                      className={`text-sm px-3 py-1 rounded ${
                        user.is_active 
                          ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    {!user.is_superuser && (
                      <button
                        onClick={() => toggleAdminStatus(user.id)}
                        className={`text-sm px-3 py-1 rounded ${
                          user.is_staff 
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        {user.is_staff ? 'Remove Admin' : 'Make Admin'}
                      </button>
                    )}
                    {!user.is_superuser && (
                      <button
                        onClick={() => handleDeleteUser(user.id, user.username)}
                        className="text-sm px-3 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">Add New User</h3>

            {formError && (
              <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={newUser.first_name}
                    onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={newUser.last_name}
                    onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password * (min 8 chars)</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Enter password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                <input
                  type="password"
                  value={newUser.password_confirm}
                  onChange={(e) => setNewUser({ ...newUser, password_confirm: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Confirm password"
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newUser.is_staff}
                    onChange={(e) => setNewUser({ ...newUser, is_staff: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Admin User</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newUser.is_active}
                    onChange={(e) => setNewUser({ ...newUser, is_active: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormError(null);
                  setNewUser({
                    username: '',
                    email: '',
                    password: '',
                    password_confirm: '',
                    first_name: '',
                    last_name: '',
                    is_staff: false,
                    is_active: true,
                  });
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersList;