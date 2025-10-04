import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { User, Bell, Shield, Palette, Globe } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // User settings state
  const [userSettings, setUserSettings] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    username: user?.username || "",
  });

  // Notification settings state
  const [notifications, setNotifications] = useState({
    stockAlerts: true,
    orderUpdates: true,
    systemNotifications: false,
    emailNotifications: true,
  });

  // Appearance settings state
  const [appearance, setAppearance] = useState({
    theme: "light",
    language: "en",
    dateFormat: "dd/mm/yyyy",
    currency: "INR",
  });

  // Security settings state
  const [security, setSecurity] = useState({
    sessionTimeout: "30",
    passwordChangeRequired: false,
  });

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Profile updated",
        description: "Your profile settings have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = () => {
    toast({
      title: "Notifications updated",
      description: "Your notification preferences have been saved.",
    });
  };

  const handleSaveAppearance = () => {
    toast({
      title: "Appearance updated",
      description: "Your appearance settings have been saved.",
    });
  };

  const handleSaveSecurity = () => {
    toast({
      title: "Security updated",
      description: "Your security settings have been saved.",
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
      </div>

      <div className="grid gap-6">
        {/* Profile Settings */}
        <Card className="bg-white material-shadow">
          <CardHeader className="border-b border-border">
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg font-semibold">Profile Settings</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={userSettings.fullName}
                  onChange={(e) => setUserSettings(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={userSettings.email}
                  onChange={(e) => setUserSettings(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={userSettings.username}
                  onChange={(e) => setUserSettings(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter your username"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-600">
                  {user?.role?.name || "No role assigned"}
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={handleSaveProfile} disabled={loading}>
                {loading ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="bg-white material-shadow">
          <CardHeader className="border-b border-border">
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg font-semibold">Notification Settings</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="stockAlerts">Stock Alerts</Label>
                  <p className="text-sm text-gray-600">Get notified when stock levels are low</p>
                </div>
                <Switch
                  id="stockAlerts"
                  checked={notifications.stockAlerts}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, stockAlerts: checked }))}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="orderUpdates">Order Updates</Label>
                  <p className="text-sm text-gray-600">Get notified about order status changes</p>
                </div>
                <Switch
                  id="orderUpdates"
                  checked={notifications.orderUpdates}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, orderUpdates: checked }))}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="systemNotifications">System Notifications</Label>
                  <p className="text-sm text-gray-600">Get notified about system updates and maintenance</p>
                </div>
                <Switch
                  id="systemNotifications"
                  checked={notifications.systemNotifications}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, systemNotifications: checked }))}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="emailNotifications">Email Notifications</Label>
                  <p className="text-sm text-gray-600">Receive notifications via email</p>
                </div>
                <Switch
                  id="emailNotifications"
                  checked={notifications.emailNotifications}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, emailNotifications: checked }))}
                />
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={handleSaveNotifications}>Save Notifications</Button>
            </div>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card className="bg-white material-shadow">
          <CardHeader className="border-b border-border">
            <div className="flex items-center space-x-2">
              <Palette className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg font-semibold">Appearance</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select value={appearance.theme} onValueChange={(value) => setAppearance(prev => ({ ...prev, theme: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select value={appearance.language} onValueChange={(value) => setAppearance(prev => ({ ...prev, language: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="hi">Hindi</SelectItem>
                    <SelectItem value="gu">Gujarati</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateFormat">Date Format</Label>
                <Select value={appearance.dateFormat} onValueChange={(value) => setAppearance(prev => ({ ...prev, dateFormat: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select date format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                    <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                    <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={appearance.currency} onValueChange={(value) => setAppearance(prev => ({ ...prev, currency: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={handleSaveAppearance}>Save Appearance</Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="bg-white material-shadow">
          <CardHeader className="border-b border-border">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg font-semibold">Security</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                <Select value={security.sessionTimeout} onValueChange={(value) => setSecurity(prev => ({ ...prev, sessionTimeout: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select session timeout" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="480">8 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="passwordChange">Require Password Change</Label>
                  <p className="text-sm text-gray-600">Force password change on next login</p>
                </div>
                <Switch
                  id="passwordChange"
                  checked={security.passwordChangeRequired}
                  onCheckedChange={(checked) => setSecurity(prev => ({ ...prev, passwordChangeRequired: checked }))}
                />
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={handleSaveSecurity}>Save Security Settings</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}