"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AdminOnly } from "@/components/auth/RoleGuard";
import { UserRole } from "@prisma/client";
// Using simple alert-based notifications instead of sonner

function formatDate(d?: string) {
  return d ? new Date(d).toLocaleString() : "-";
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole | "">("");
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);

  const { data: session } = useSession();

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search) query.set("search", search);
      const res = await fetch(`/api/admin/users?${query.toString()}`);
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (user: any) => {
    setEditingUser(user);
    setEmail(user.email || "");
    setRole(user.role || "");
    setNewPassword("");
  };

  const closeEdit = () => {
    setEditingUser(null);
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editingUser) return;
    setIsSaving(true);
    try {
      const body: any = { id: editingUser.id };
      if (email) body.email = email;
      if (role) body.role = role;
      if (newPassword) body.newPassword = newPassword;

      const res = await fetch(`/api/admin/users`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || "Failed to update user");
      }

      await fetchUsers();
      closeEdit();
      alert("User updated");
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setPage(1);
    await fetchUsers();
  };

  return (
    <AdminOnly>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Users</h1>
            <p className="mt-2 text-gray-600">
              Manage application users (admin only)
            </p>
          </div>

          <div className="mb-6 flex justify-between items-center">
            <form
              onSubmit={handleSearch}
              className="flex items-center space-x-2"
            >
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email..."
                className="mt-1 block w-64 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => setCreatingUser(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 ml-2"
              >
                Add User
              </button>
            </form>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">Total: {total}</div>
              <button
                onClick={() => {
                  setPage(1);
                  fetchUsers();
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="p-6">
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-12 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center text-gray-500">
                    No users found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Updated
                          </th>
                          <th className="px-6 py-3" />
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((u) => (
                          <tr key={u.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {u.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {u.role}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(u.createdAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(u.updatedAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center space-x-2 justify-end">
                                <button
                                  onClick={() => startEdit(u)}
                                  className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={async () => {
                                    if (!confirm(`Delete user ${u.email}?`))
                                      return;
                                    try {
                                      setDeletingUserId(u.id);
                                      const res = await fetch(
                                        `/api/admin/users`,
                                        {
                                          method: "DELETE",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                          body: JSON.stringify({ id: u.id }),
                                        }
                                      );
                                      if (!res.ok) {
                                        const err = await res.json();
                                        throw new Error(
                                          err?.error || "Failed to delete user"
                                        );
                                      }
                                      await fetchUsers();
                                      alert("User deleted");
                                    } catch (err) {
                                      console.error(err);
                                      alert(
                                        err instanceof Error
                                          ? err.message
                                          : "Error"
                                      );
                                    } finally {
                                      setDeletingUserId(null);
                                    }
                                  }}
                                  disabled={deletingUserId === u.id}
                                  className="inline-flex items-center px-3 py-1 border border-red-300 shadow-sm text-sm font-medium rounded text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
                                >
                                  {deletingUserId === u.id
                                    ? "Deleting..."
                                    : "Delete"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-100 flex items-center justify-between">
                <div className="text-sm text-gray-600">Page {page}</div>
                <div className="space-x-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>

          {editingUser && (
            <div className="fixed inset-0 z-40 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black opacity-30"
                onClick={closeEdit}
              />
              <form
                onSubmit={handleSave}
                className="bg-white rounded-lg shadow p-6 z-50 w-full max-w-md"
              >
                <h2 className="text-lg font-medium text-gray-900">Edit User</h2>

                <label className="block text-sm font-medium text-gray-700 mt-4">
                  Email
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                />

                <label className="block text-sm font-medium text-gray-700 mt-4">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                >
                  <option value="">Select role</option>
                  <option value={UserRole.ADMIN}>{UserRole.ADMIN}</option>
                  <option value={UserRole.USER}>{UserRole.USER}</option>
                </select>

                <label className="block text-sm font-medium text-gray-700 mt-4">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                />

                <div className="mt-6 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={closeEdit}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            </div>
          )}
          {creatingUser && (
            <div className="fixed inset-0 z-40 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black opacity-30"
                onClick={() => setCreatingUser(false)}
              />
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSaving(true);
                  try {
                    if (!newUserEmail || !newUserPassword) {
                      throw new Error("Email and password are required");
                    }
                    const res = await fetch(`/api/admin/users`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        email: newUserEmail,
                        password: newUserPassword,
                        role: newUserRole,
                      }),
                    });
                    if (!res.ok) {
                      const err = await res.json();
                      throw new Error(err?.error || "Failed to create user");
                    }
                    await fetchUsers();
                    setCreatingUser(false);
                    setNewUserEmail("");
                    setNewUserPassword("");
                    setNewUserRole("");
                    alert("User created");
                  } catch (err) {
                    console.error(err);
                    alert(err instanceof Error ? err.message : "Error");
                  } finally {
                    setIsSaving(false);
                  }
                }}
                className="bg-white rounded-lg shadow p-6 z-50 w-full max-w-md"
              >
                <h2 className="text-lg font-medium text-gray-900">Add User</h2>

                <label className="block text-sm font-medium text-gray-700 mt-4">
                  Email
                </label>
                <input
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                />

                <label className="block text-sm font-medium text-gray-700 mt-4">
                  Role
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                >
                  <option value="">Select role</option>
                  <option value={UserRole.ADMIN}>{UserRole.ADMIN}</option>
                  <option value={UserRole.USER}>{UserRole.USER}</option>
                </select>

                <label className="block text-sm font-medium text-gray-700 mt-4">
                  Password
                </label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                />

                <div className="mt-6 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setCreatingUser(false)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    {isSaving ? "Creating..." : "Create"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </AdminOnly>
  );
}
