import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRetryableQuery } from "@/hooks/useRetryableQuery";
import { LoadingSpinner, RetryableError } from "@/components/LoadingStates";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, Plus, Edit, Trash2, Shield, MoreHorizontal, Settings, Eye } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function UserManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isViewUsersDialogOpen, setIsViewUsersDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [selectedRoleForUsers, setSelectedRoleForUsers] = useState<any>(null);
  const [userFilter, setUserFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // New user form state
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
    roleId: "",
  });

  // Role form state
  const [roleForm, setRoleForm] = useState({
    name: "",
    description: "",
  });

  // Permissions state for role dialog
  const [rolePermissions, setRolePermissions] = useState<Record<string, {canRead: boolean, canWrite: boolean, canDelete: boolean}>>({});

  // Enhanced queries with retry logic
  const usersQuery = useRetryableQuery({
    queryKey: ["/api/users"],
    staleTime: 60 * 1000, // 1 minute
  });

  const rolesQuery = useRetryableQuery({
    queryKey: ["/api/roles"],
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Extract data with fallbacks
  const users = usersQuery.data?.users || [];
  const roles = rolesQuery.data?.roles || [];
  const usersLoading = usersQuery.isLoading;
  const rolesLoading = rolesQuery.isLoading;

  const { data: pages = [], isLoading: pagesLoading } = useQuery({
    queryKey: ["/api/pages"],
  });

  // Fetch users for selected role
  const { data: roleUsers = [], isLoading: usersForRoleLoading } = useQuery({
    queryKey: ["/api/roles", selectedRoleForUsers?.id, "users"],
    enabled: !!selectedRoleForUsers?.id,
  });

  // Fetch permissions for editing role
  const { data: existingPermissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ["/api/roles", editingRole?.id, "permissions"],
    enabled: !!editingRole?.id,
  });

  // Initialize permissions when editing role
  useEffect(() => {
    if (editingRole) {
      setRoleForm({
        name: editingRole.name || "",
        description: editingRole.description || "",
      });

      // Initialize permissions
      const initialPermissions: Record<string, {canRead: boolean, canWrite: boolean, canDelete: boolean}> = {};
      pages.forEach((page: any) => {
        const existing = existingPermissions.find((p: any) => p.pageId === page.id);
        initialPermissions[page.id] = {
          canRead: existing?.canRead || false,
          canWrite: existing?.canWrite || false,
          canDelete: existing?.canDelete || false,
        };
      });
      setRolePermissions(initialPermissions);
    } else {
      // Reset for new role
      setRoleForm({ name: "", description: "" });
      const initialPermissions: Record<string, {canRead: boolean, canWrite: boolean, canDelete: boolean}> = {};
      pages.forEach((page: any) => {
        initialPermissions[page.id] = { canRead: false, canWrite: false, canDelete: false };
      });
      setRolePermissions(initialPermissions);
    }
  }, [editingRole, pages, existingPermissions]);

  // User mutations
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await apiRequest("POST", "/api/users", userData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsUserDialogOpen(false);
      setNewUser({ username: "", password: "", fullName: "", email: "", roleId: "" });
      toast({
        title: "User created",
        description: "User has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PUT", `/api/users/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsUserDialogOpen(false);
      setEditingUser(null);
      toast({
        title: "User updated",
        description: "User has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User deleted",
        description: "User has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  // Role mutations
  const createRoleMutation = useMutation({
    mutationFn: async (roleData: any) => {
      const roleResponse = await apiRequest("POST", "/api/roles", roleData);
      const role = await roleResponse.json();
      
      // Set permissions
      const permissions = Object.entries(rolePermissions)
        .map(([pageId, perms]) => ({
          pageId: parseInt(pageId),
          canRead: perms?.canRead || false,
          canWrite: perms?.canWrite || false,
          canDelete: perms?.canDelete || false
        }))
        .filter(p => p.canRead || p.canWrite || p.canDelete);

      if (permissions.length > 0) {
        await apiRequest("PUT", `/api/roles/${role.id}/permissions`, permissions);
      }
      
      return role;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setIsRoleDialogOpen(false);
      setRoleForm({ name: "", description: "" });
      toast({
        title: "Role created",
        description: "Role has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create role",
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (roleData: any) => {
      // Update role info
      const roleResponse = await apiRequest("PUT", `/api/roles/${editingRole.id}`, roleData);
      const role = await roleResponse.json();
      
      // Update permissions
      const permissions = Object.entries(rolePermissions)
        .map(([pageId, perms]) => ({
          pageId: parseInt(pageId),
          canRead: perms?.canRead || false,
          canWrite: perms?.canWrite || false,
          canDelete: perms?.canDelete || false
        }))
        .filter(p => p.canRead || p.canWrite || p.canDelete);

      await apiRequest("PUT", `/api/roles/${editingRole.id}/permissions`, permissions);
      
      return role;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setIsRoleDialogOpen(false);
      setEditingRole(null);
      toast({
        title: "Role updated",
        description: "Role and permissions have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: number) => {
      await apiRequest("DELETE", `/api/roles/${roleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({
        title: "Role deleted",
        description: "Role has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete role",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const handleUserSubmit = () => {
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, data: newUser });
    } else {
      createUserMutation.mutate(newUser);
    }
  };

  const handleRoleSubmit = () => {
    if (editingRole) {
      updateRoleMutation.mutate(roleForm);
    } else {
      createRoleMutation.mutate(roleForm);
    }
  };

  const openEditUser = (user: any) => {
    setEditingUser(user);
    setNewUser({
      username: user.username,
      password: "",
      fullName: user.fullName || "",
      email: user.email || "",
      roleId: user.roleId?.toString() || "",
    });
    setIsUserDialogOpen(true);
  };

  const openEditRole = (role: any) => {
    setEditingRole(role);
    setIsRoleDialogOpen(true);
  };

  const openViewUsers = (role: any) => {
    setSelectedRoleForUsers(role);
    setUserFilter('all');
    setIsViewUsersDialogOpen(true);
  };

  const updatePermission = (pageId: string, permissionType: 'canRead' | 'canWrite' | 'canDelete', value: boolean) => {
    setRolePermissions(prev => ({
      ...prev,
      [pageId]: {
        ...prev[pageId],
        [permissionType]: value
      }
    }));
  };

  const setFullPermissions = (pageId: string, value: boolean) => {
    setRolePermissions(prev => ({
      ...prev,
      [pageId]: {
        canRead: value,
        canWrite: value,
        canDelete: value
      }
    }));
  };

  // Filter users based on status
  const filteredRoleUsers = roleUsers.filter((user: any) => {
    if (userFilter === 'active') return user.isActive;
    if (userFilter === 'inactive') return !user.isActive;
    return true; // 'all'
  });

  if (!user?.role || user.role.name !== 'Admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">You don't have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">User Management</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Users
              </CardTitle>
              <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => {
                    setEditingUser(null);
                    setNewUser({ username: "", password: "", fullName: "", email: "", roleId: "" });
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingUser ? "Edit User" : "Create New User"}</DialogTitle>
                    <DialogDescription>
                      {editingUser ? "Update user information" : "Add a new user to the system"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={newUser.username}
                        onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                        placeholder="Enter username"
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                        placeholder={editingUser ? "Leave blank to keep current password" : "Enter password"}
                      />
                    </div>
                    <div>
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        value={newUser.fullName}
                        onChange={(e) => setNewUser(prev => ({ ...prev, fullName: e.target.value }))}
                        placeholder="Enter full name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter email"
                      />
                    </div>
                    <div>
                      <Label htmlFor="role">Role</Label>
                      <Select value={newUser.roleId} onValueChange={(value) => setNewUser(prev => ({ ...prev, roleId: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role: any) => (
                            <SelectItem key={role.id} value={role.id.toString()}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleUserSubmit} className="w-full" disabled={createUserMutation.isPending || updateUserMutation.isPending}>
                      {editingUser ? "Update User" : "Create User"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <p>Loading users...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.username}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role?.name}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => openEditUser(user)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => deleteUserMutation.mutate(user.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Roles Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Roles
              </CardTitle>
              <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => {
                    setEditingRole(null);
                    setRoleForm({ name: "", description: "" });
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Role
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingRole ? "Edit Role" : "Create New Role"}</DialogTitle>
                    <DialogDescription>
                      {editingRole ? "Update role information and permissions" : "Add a new role with permissions"}
                    </DialogDescription>
                  </DialogHeader>
                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList>
                      <TabsTrigger value="basic">Basic Info</TabsTrigger>
                      <TabsTrigger value="permissions">Permissions</TabsTrigger>
                    </TabsList>
                    <TabsContent value="basic" className="space-y-4">
                      <div>
                        <Label htmlFor="roleName">Role Name</Label>
                        <Input
                          id="roleName"
                          value={roleForm.name}
                          onChange={(e) => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter role name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="roleDescription">Description</Label>
                        <Input
                          id="roleDescription"
                          value={roleForm.description}
                          onChange={(e) => setRoleForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Enter role description"
                        />
                      </div>
                    </TabsContent>
                    <TabsContent value="permissions" className="space-y-4">
                      <div className="space-y-4">
                        <h4 className="font-medium">Page Permissions</h4>
                        {pagesLoading ? (
                          <p>Loading permissions...</p>
                        ) : (
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {pages.map((page: any) => (
                              <div key={page.id} className="flex items-center justify-between p-3 border rounded">
                                <div className="flex-1">
                                  <p className="font-medium">{page.displayName}</p>
                                  <p className="text-sm text-muted-foreground">{page.description}</p>
                                </div>
                                <div className="flex gap-3">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`full-${page.id}`}
                                      checked={rolePermissions[page.id]?.canRead && rolePermissions[page.id]?.canWrite && rolePermissions[page.id]?.canDelete}
                                      onCheckedChange={(checked) => setFullPermissions(page.id.toString(), checked as boolean)}
                                    />
                                    <Label htmlFor={`full-${page.id}`} className="text-sm font-medium">Full</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`read-${page.id}`}
                                      checked={rolePermissions[page.id]?.canRead || false}
                                      onCheckedChange={(checked) => updatePermission(page.id.toString(), 'canRead', checked as boolean)}
                                    />
                                    <Label htmlFor={`read-${page.id}`} className="text-sm">Read</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`write-${page.id}`}
                                      checked={rolePermissions[page.id]?.canWrite || false}
                                      onCheckedChange={(checked) => updatePermission(page.id.toString(), 'canWrite', checked as boolean)}
                                    />
                                    <Label htmlFor={`write-${page.id}`} className="text-sm">Write</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`delete-${page.id}`}
                                      checked={rolePermissions[page.id]?.canDelete || false}
                                      onCheckedChange={(checked) => updatePermission(page.id.toString(), 'canDelete', checked as boolean)}
                                    />
                                    <Label htmlFor={`delete-${page.id}`} className="text-sm">Delete</Label>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsRoleDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleRoleSubmit} 
                      disabled={createRoleMutation.isPending || updateRoleMutation.isPending}
                    >
                      {editingRole ? "Update Role" : "Create Role"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {rolesLoading ? (
              <p>Loading roles...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role: any) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell>{role.description}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => openViewUsers(role)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Users
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditRole(role)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Role
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => deleteRoleMutation.mutate(role.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Users Dialog */}
      <Dialog open={isViewUsersDialogOpen} onOpenChange={setIsViewUsersDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Users with "{selectedRoleForUsers?.name}" Role</DialogTitle>
            <DialogDescription>
              List of users assigned to this role
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Filter Controls */}
            <div className="flex gap-2">
              <Label className="text-sm font-medium">Filter:</Label>
              <div className="flex gap-2">
                <Button
                  variant={userFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setUserFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={userFilter === 'active' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setUserFilter('active')}
                >
                  Active
                </Button>
                <Button
                  variant={userFilter === 'inactive' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setUserFilter('inactive')}
                >
                  Inactive
                </Button>
              </div>
            </div>

            {/* Users List */}
            {usersForRoleLoading ? (
              <p>Loading users...</p>
            ) : filteredRoleUsers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                {userFilter === 'all' 
                  ? "No users are assigned to this role." 
                  : `No ${userFilter} users are assigned to this role.`
                }
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredRoleUsers.map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{user.username}</p>
                      <p className="text-sm text-muted-foreground">{user.fullName || "No full name"}</p>
                      <p className="text-sm text-muted-foreground">{user.email || "No email"}</p>
                    </div>
                    <Badge variant={user.isActive ? "default" : "secondary"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}