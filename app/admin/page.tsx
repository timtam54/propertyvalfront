'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Users, Activity, BarChart3, Clock,
  Globe, FileText, RefreshCw, ChevronDown, ChevronUp,
  Calendar, Eye, TrendingUp, Settings, Key, Search,
  MapPin, Home, ExternalLink, LogIn
} from 'lucide-react';
import { toast } from 'sonner';
import { API } from '@/lib/config';
import { usePageView } from '@/hooks/useAudit';

interface UserStats {
  username: string;
  totalVisits: number;
  firstVisit: string;
  lastVisit: string;
  ipAddresses: string[];
  uniquePages: number;
}

interface RegisteredUser {
  id: string;
  email: string;
  username: string;
  subscription_tier: string;
  subscription_active: boolean;
  created_at: string;
  last_login: string | null;
  is_active: boolean;
  auth_provider?: string;
  picture?: string;
}

interface AuditStats {
  totalRecords: number;
  uniqueUsers: number;
  recentActivity: number;
  pageStats: { page: string; count: number }[];
  dailyVisits: { date: string; count: number }[];
}

interface AuditRecord {
  id: number;
  action: string;
  page: string;
  username: string;
  dte: string;
  ipaddress: string;
  propertyid: number;
}

interface ApiKeys {
  domain_api_key: string | null;
  corelogic_client_key: string | null;
  corelogic_secret_key: string | null;
  realestate_api_key: string | null;
  pricefinder_api_key: string | null;
  google_places_api_key: string | null;
}

interface SoldProperty {
  id: string;
  location: string;
  beds: number;
  baths: number;
  carpark: number;
  price: number;
  sold_price: number;
  sale_date: string;
  images: string[];
  property_type?: string;
  user_email?: string;
}

interface CachedSale {
  id: string;
  address: string;
  price: number;
  beds: number | null;
  baths: number | null;
  cars: number | null;
  land_area: number | null;
  property_type: string;
  sold_date: string;
  source: string;
}

interface CachedSearch {
  cache_key: string;
  suburb: string;
  state: string;
  postcode: string | null;
  property_type: string;
  cached_at: string;
  total: number;
  scraped_url: string;
  is_valid: boolean;
  sales: CachedSale[];
}

export default function AdminPage() {
  const router = useRouter();

  // Track page view for audit
  usePageView('admin');

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'activity' | 'settings' | 'reports' | 'searches'>('overview');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserStats[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([]);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState('');
  const [pageFilter, setPageFilter] = useState('');
  const [auditPage, setAuditPage] = useState(0);
  const [auditTotal, setAuditTotal] = useState(0);
  const RECORDS_PER_PAGE = 50;

  // Sold properties state
  const [soldProperties, setSoldProperties] = useState<SoldProperty[]>([]);
  const [loadingSold, setLoadingSold] = useState(false);

  // Audit loading state
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Cached property searches state
  const [cachedSearches, setCachedSearches] = useState<CachedSearch[]>([]);
  const [loadingSearches, setLoadingSearches] = useState(false);
  const [expandedSearch, setExpandedSearch] = useState<string | null>(null);

  // Settings state
  const [savingSettings, setSavingSettings] = useState(false);
  const [apiSettings, setApiSettings] = useState<ApiKeys>({
    domain_api_key: '',
    corelogic_client_key: '',
    corelogic_secret_key: '',
    realestate_api_key: '',
    pricefinder_api_key: '',
    google_places_api_key: ''
  });

  useEffect(() => {
    loadData();
    loadApiSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'activity') {
      loadAuditRecords();
    }
    if (activeTab === 'reports') {
      loadSoldProperties();
    }
    if (activeTab === 'searches') {
      loadCachedSearches();
    }
  }, [activeTab, auditPage, userFilter, pageFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes, registeredRes] = await Promise.all([
        fetch(`${API}/audit/users`),
        fetch(`${API}/audit/stats`),
        fetch(`${API}/auth/users`)
      ]);

      const usersData = await usersRes.json();
      const statsData = await statsRes.json();
      const registeredData = await registeredRes.json();

      if (usersData.success) {
        setUsers(usersData.users);
      }
      if (statsData.success) {
        setStats(statsData.stats);
      }
      if (registeredData.success) {
        setRegisteredUsers(registeredData.users);
      }
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadApiSettings = async () => {
    try {
      const response = await fetch(`${API}/api-settings`);
      const data = await response.json();

      if (data.success && data.settings) {
        setApiSettings({
          domain_api_key: data.settings.domain_api_key || '',
          corelogic_client_key: data.settings.corelogic_client_key || '',
          corelogic_secret_key: data.settings.corelogic_secret_key || '',
          realestate_api_key: data.settings.realestate_api_key || '',
          pricefinder_api_key: data.settings.pricefinder_api_key || '',
          google_places_api_key: data.settings.google_places_api_key || ''
        });
      }
    } catch (err) {
      console.error('Failed to load API settings:', err);
    }
  };

  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setApiSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);

    try {
      const response = await fetch(`${API}/api-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiSettings)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('API settings saved successfully!');
        await loadApiSettings();
      } else {
        toast.error('Failed to save API settings');
      }
    } catch (err) {
      toast.error('Error saving API settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const loadAuditRecords = async () => {
    setLoadingAudit(true);
    try {
      const params = new URLSearchParams({
        limit: RECORDS_PER_PAGE.toString(),
        offset: (auditPage * RECORDS_PER_PAGE).toString()
      });

      if (userFilter) params.append('username', userFilter);
      if (pageFilter) params.append('page', pageFilter);

      const response = await fetch(`${API}/audit?${params}`);
      const data = await response.json();

      setAuditRecords(data.records || []);
      setAuditTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to load audit records:', error);
    } finally {
      setLoadingAudit(false);
    }
  };

  const loadSoldProperties = async () => {
    setLoadingSold(true);
    try {
      const response = await fetch(`${API}/properties/sold/list`);
      const data = await response.json();

      if (data.success) {
        setSoldProperties(data.properties || []);
      }
    } catch (error) {
      console.error('Failed to load sold properties:', error);
    } finally {
      setLoadingSold(false);
    }
  };

  const loadCachedSearches = async () => {
    setLoadingSearches(true);
    try {
      const response = await fetch(`${API}/historic-sales-cache/all`);
      const data = await response.json();

      if (data.success) {
        setCachedSearches(data.searches || []);
      }
    } catch (error) {
      console.error('Failed to load cached searches:', error);
    } finally {
      setLoadingSearches(false);
    }
  };

  const formatPrice = (price: number) => {
    if (!price) return 'N/A';
    return `$${price.toLocaleString()}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateShort = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'short'
    });
  };

  const handleLoginAsUser = (user: RegisteredUser) => {
    // Create a Google-style user object to store in localStorage
    const impersonatedUser = {
      email: user.email,
      name: user.username,
      picture: user.picture || undefined,
      sub: user.id // Use user ID as the Google sub
    };

    // Store in localStorage (same format as GoogleOAuth)
    localStorage.setItem('googleUser', JSON.stringify(impersonatedUser));

    toast.success(`Logged in as ${user.username}`);

    // Redirect to home page
    router.push('/');
  };

  const getMaxVisits = () => {
    if (!stats?.dailyVisits.length) return 1;
    return Math.max(...stats.dailyVisits.map(d => d.count));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-slate-900 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Back</span>
              </Link>
              <div className="h-6 w-px bg-slate-700" />
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-emerald-400 rounded-lg flex items-center justify-center">
                  <Settings className="w-4 h-4 text-slate-900" />
                </div>
                <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
              </div>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Tabs - integrated into header */}
        <div className="border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex gap-1 overflow-x-auto -mb-px">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'users', label: 'Users', icon: Users },
                { id: 'activity', label: 'Activity Log', icon: Activity },
                { id: 'searches', label: 'Property Searches', icon: Search },
                { id: 'settings', label: 'Settings', icon: Settings },
                { id: 'reports', label: 'Reports', icon: FileText }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-cyan-400 text-cyan-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-cyan-100 rounded-lg">
                    <Users className="w-5 h-5 text-cyan-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-500">Total Users</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.uniqueUsers}</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Eye className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-500">Total Page Views</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.totalRecords.toLocaleString()}</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-500">Last 24 Hours</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.recentActivity}</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-500">Avg Daily</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.dailyVisits.length > 0
                    ? Math.round(stats.dailyVisits.reduce((a, b) => a + b.count, 0) / stats.dailyVisits.length)
                    : 0}
                </p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Visits Chart */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Visits (Last 30 Days)</h3>
                <div className="h-48 flex items-end gap-1">
                  {stats.dailyVisits.map((day, idx) => (
                    <div
                      key={day.date}
                      className="flex-1 bg-cyan-500 rounded-t hover:bg-cyan-600 transition-colors cursor-pointer group relative"
                      style={{ height: `${(day.count / getMaxVisits()) * 100}%`, minHeight: '4px' }}
                      title={`${day.date}: ${day.count} visits`}
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        {formatDateShort(day.date)}: {day.count}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>{stats.dailyVisits[0]?.date ? formatDateShort(stats.dailyVisits[0].date) : '-'}</span>
                  <span>{stats.dailyVisits[stats.dailyVisits.length - 1]?.date ? formatDateShort(stats.dailyVisits[stats.dailyVisits.length - 1].date) : '-'}</span>
                </div>
              </div>

              {/* Page Stats */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Visited Pages</h3>
                <div className="space-y-3">
                  {stats.pageStats.slice(0, 8).map((page, idx) => (
                    <div key={page.page} className="flex items-center gap-3">
                      <span className="w-6 text-sm font-medium text-gray-400">{idx + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-700">{page.page || 'unknown'}</span>
                          <span className="text-sm text-gray-500">{page.count}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full"
                            style={{ width: `${(page.count / stats.pageStats[0].count) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Registered Users Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Registered Users ({registeredUsers.length})</h3>
                <p className="text-sm text-gray-500 mt-1">Users who have signed up or logged in via OAuth</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subscription</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registered</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {registeredUsers.map(user => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {user.picture ? (
                              <img src={user.picture} alt={user.username} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                {user.username?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                            )}
                            <span className="font-medium text-gray-900">{user.username}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{user.email}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            user.auth_provider === 'google' ? 'bg-red-100 text-red-800' :
                            user.auth_provider === 'microsoft' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {user.auth_provider || 'local'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            user.subscription_tier === 'pro' ? 'bg-purple-100 text-purple-800' :
                            user.subscription_tier === 'basic' ? 'bg-cyan-100 text-cyan-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {user.subscription_tier}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(user.created_at)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{user.last_login ? formatDate(user.last_login) : 'Never'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleLoginAsUser(user)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-cyan-700 bg-cyan-50 border border-cyan-200 rounded-lg hover:bg-cyan-100 hover:border-cyan-300 transition-colors"
                            title={`Login as ${user.username}`}
                          >
                            <LogIn className="w-3.5 h-3.5" />
                            Login as
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {registeredUsers.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No registered users yet</p>
                  <p className="text-sm mt-1">Users will appear here when they sign in</p>
                </div>
              )}
            </div>

            {/* Audit Activity Users */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">User Activity Summary ({users.length})</h3>
                <p className="text-sm text-gray-500 mt-1">Activity breakdown from audit logs</p>
              </div>
              <div className="divide-y divide-gray-200">
                {users.map(user => (
                  <div key={user.username} className="hover:bg-gray-50 transition-colors">
                    <button
                      onClick={() => setExpandedUser(expandedUser === user.username ? null : user.username)}
                      className="w-full p-4 flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {user.username?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.username || 'anonymous'}</p>
                          <p className="text-sm text-gray-500">
                            {user.totalVisits} visits · {user.uniquePages} pages
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <p className="text-sm text-gray-500">Last active</p>
                          <p className="text-sm font-medium text-gray-700">{formatDate(user.lastVisit)}</p>
                        </div>
                        {expandedUser === user.username ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {expandedUser === user.username && (
                      <div className="px-4 pb-4 bg-gray-50">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <p className="text-xs font-medium text-gray-500 mb-1">First Visit</p>
                            <p className="text-sm text-gray-900">{formatDate(user.firstVisit)}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <p className="text-xs font-medium text-gray-500 mb-1">Last Visit</p>
                            <p className="text-sm text-gray-900">{formatDate(user.lastVisit)}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <p className="text-xs font-medium text-gray-500 mb-1">IP Addresses</p>
                            <div className="flex flex-wrap gap-1">
                              {user.ipAddresses.slice(0, 3).map(ip => (
                                <span key={ip} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                  {ip}
                                </span>
                              ))}
                              {user.ipAddresses.length > 3 && (
                                <span className="text-xs text-gray-500">+{user.ipAddresses.length - 3} more</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setUserFilter(user.username);
                            setActiveTab('activity');
                          }}
                          className="mt-3 text-sm text-cyan-600 hover:text-cyan-700 font-medium"
                        >
                          View activity log →
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Filter by User</label>
                  <select
                    value={userFilter}
                    onChange={(e) => { setUserFilter(e.target.value); setAuditPage(0); }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">All Users</option>
                    {users.map(user => (
                      <option key={user.username} value={user.username}>{user.username}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Page</label>
                  <select
                    value={pageFilter}
                    onChange={(e) => { setPageFilter(e.target.value); setAuditPage(0); }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">All Pages</option>
                    {stats?.pageStats.map(page => (
                      <option key={page.page} value={page.page}>{page.page}</option>
                    ))}
                  </select>
                </div>
                {(userFilter || pageFilter) && (
                  <div className="flex items-end">
                    <button
                      onClick={() => { setUserFilter(''); setPageFilter(''); setAuditPage(0); }}
                      className="px-4 py-2 text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Activity Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Activity Log
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({auditTotal.toLocaleString()} records)
                  </span>
                </h3>
              </div>

              {loadingAudit ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading activity log...</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date/Time</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Page</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {auditRecords.map(record => (
                          <tr key={record.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                              {formatDate(record.dte)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {record.username || 'anonymous'}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cyan-100 text-cyan-800">
                                {record.page}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {record.action}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                              {record.ipaddress}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {record.propertyid || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {auditTotal > RECORDS_PER_PAGE && (
                    <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                      <p className="text-sm text-gray-500">
                        Showing {auditPage * RECORDS_PER_PAGE + 1} to {Math.min((auditPage + 1) * RECORDS_PER_PAGE, auditTotal)} of {auditTotal}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setAuditPage(p => Math.max(0, p - 1))}
                          disabled={auditPage === 0}
                          className="px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setAuditPage(p => p + 1)}
                          disabled={(auditPage + 1) * RECORDS_PER_PAGE >= auditTotal}
                          className="px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Property Searches Tab */}
        {activeTab === 'searches' && (
          <div className="space-y-6">
            {/* Summary Header */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500 rounded-lg">
                    <Search className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Cached Property Searches</h3>
                    <p className="text-sm text-gray-500">Historic sales data cached from Homely.com.au (7 day TTL)</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-indigo-600">{cachedSearches.length}</p>
                  <p className="text-sm text-gray-500">Cached Searches</p>
                </div>
              </div>

              {/* Stats */}
              {cachedSearches.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-500">Total Properties</p>
                    <p className="text-lg font-bold text-gray-900">
                      {cachedSearches.reduce((sum, s) => sum + s.total, 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-500">Valid Caches</p>
                    <p className="text-lg font-bold text-green-600">
                      {cachedSearches.filter(s => s.is_valid).length}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-500">Expired Caches</p>
                    <p className="text-lg font-bold text-orange-600">
                      {cachedSearches.filter(s => !s.is_valid).length}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-500">Unique Suburbs</p>
                    <p className="text-lg font-bold text-gray-900">
                      {new Set(cachedSearches.map(s => `${s.suburb}-${s.state}`)).size}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Searches List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">All Cached Searches</h3>
              </div>

              {loadingSearches ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto mb-3"></div>
                  <p className="text-gray-500">Loading cached searches...</p>
                </div>
              ) : cachedSearches.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No cached searches yet</p>
                  <p className="text-sm mt-1">Property searches will be cached here when users view historic sales</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {cachedSearches.map(search => (
                    <div key={search.cache_key} className="hover:bg-gray-50 transition-colors">
                      <button
                        onClick={() => setExpandedSearch(expandedSearch === search.cache_key ? null : search.cache_key)}
                        className="w-full p-4 flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            search.is_valid ? 'bg-green-100' : 'bg-orange-100'
                          }`}>
                            <MapPin className={`w-5 h-5 ${search.is_valid ? 'text-green-600' : 'text-orange-600'}`} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 capitalize">
                              {search.suburb.replace(/-/g, ' ')}, {search.state} {search.postcode || ''}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 capitalize">
                                {search.property_type === 'all' ? 'All Types' : search.property_type}
                              </span>
                              <span>{search.total} properties</span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                search.is_valid ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                              }`}>
                                {search.is_valid ? 'Valid' : 'Expired'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right hidden sm:block">
                            <p className="text-sm text-gray-500">Cached</p>
                            <p className="text-sm font-medium text-gray-700">{formatDate(search.cached_at)}</p>
                          </div>
                          {expandedSearch === search.cache_key ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </button>

                      {/* Expanded Property List */}
                      {expandedSearch === search.cache_key && (
                        <div className="px-4 pb-4 bg-gray-50">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-medium text-gray-700">
                              {search.total} properties in this search
                            </p>
                            {search.scraped_url && (
                              <a
                                href={search.scraped_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sm text-cyan-600 hover:text-cyan-700"
                              >
                                <ExternalLink className="w-4 h-4" />
                                View on Homely
                              </a>
                            )}
                          </div>

                          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <table className="w-full">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Details</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Sold</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {search.sales.slice(0, 20).map((sale, idx) => (
                                  <tr key={sale.id || idx} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 text-sm text-gray-900">{sale.address}</td>
                                    <td className="px-3 py-2 text-sm font-semibold text-emerald-600">
                                      {formatPrice(sale.price)}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-gray-700 hidden md:table-cell">
                                      {sale.beds && <span className="mr-2">🛏 {sale.beds}</span>}
                                      {sale.baths && <span className="mr-2">🛁 {sale.baths}</span>}
                                      {sale.cars && <span>🚗 {sale.cars}</span>}
                                      {sale.land_area && <span className="ml-2 text-gray-500">{sale.land_area}m²</span>}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-gray-500 hidden sm:table-cell">{sale.sold_date}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {search.sales.length > 20 && (
                              <div className="px-3 py-2 bg-gray-50 text-center text-sm text-gray-500">
                                ... and {search.sales.length - 20} more properties
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onClick={() => router.push('/settings/marketing')}
                className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-xl p-6 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-blue-900">Marketing Packages</h3>
                </div>
                <p className="text-blue-700 text-sm">Configure marketing packages with different pricing tiers.</p>
              </div>

              <div
                onClick={() => router.push('/settings/market')}
                className="bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-300 rounded-xl p-6 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-amber-500 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-amber-900">Market Context</h3>
                </div>
                <p className="text-amber-700 text-sm">Update interest rates and market statistics.</p>
              </div>
            </div>

            {/* API Keys Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Key className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Property Data API Keys</h3>
                  <p className="text-sm text-gray-500">Add API keys for property data services to get more accurate valuations.</p>
                </div>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Domain.com.au API Key
                  </label>
                  <input
                    type="text"
                    name="domain_api_key"
                    value={apiSettings.domain_api_key || ''}
                    onChange={handleSettingsChange}
                    placeholder="Enter Domain API key (optional)"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Realestate.com.au API Key
                  </label>
                  <input
                    type="text"
                    name="realestate_api_key"
                    value={apiSettings.realestate_api_key || ''}
                    onChange={handleSettingsChange}
                    placeholder="Enter Realestate.com.au API key (optional)"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PriceFinder API Key
                  </label>
                  <input
                    type="text"
                    name="pricefinder_api_key"
                    value={apiSettings.pricefinder_api_key || ''}
                    onChange={handleSettingsChange}
                    placeholder="Enter PriceFinder API key (optional)"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Google Places API Key
                  </label>
                  <input
                    type="text"
                    name="google_places_api_key"
                    value={apiSettings.google_places_api_key || ''}
                    onChange={handleSettingsChange}
                    placeholder="Enter Google Places API key (optional)"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="px-6 py-2 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600 disabled:opacity-50 transition-colors"
                  >
                    {savingSettings ? 'Saving...' : 'Save API Settings'}
                  </button>
                </div>
              </form>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Without API keys, the app uses free web scraping to get property data.
                  This may be slower but provides basic comparable property data at no cost.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* Sold Properties Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-green-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Sold Properties Report</h3>
                      <p className="text-sm text-gray-500">All properties marked as sold across all users</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-600">{soldProperties.length}</p>
                    <p className="text-sm text-gray-500">Total Sold</p>
                  </div>
                </div>

                {/* Summary Stats */}
                {soldProperties.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="text-xs text-gray-500">Total Value</p>
                      <p className="text-lg font-bold text-gray-900">
                        ${(soldProperties.reduce((sum, p) => sum + (p.sold_price || 0), 0) / 1000000).toFixed(2)}M
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="text-xs text-gray-500">Avg Sale Price</p>
                      <p className="text-lg font-bold text-gray-900">
                        ${Math.round(soldProperties.reduce((sum, p) => sum + (p.sold_price || 0), 0) / soldProperties.length / 1000)}K
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="text-xs text-gray-500">Avg vs List</p>
                      <p className={`text-lg font-bold ${
                        (() => {
                          const propsWithBoth = soldProperties.filter(p => p.price && p.sold_price);
                          if (propsWithBoth.length === 0) return 'text-gray-500';
                          const avgDiff = propsWithBoth.reduce((sum, p) => sum + ((p.sold_price - p.price) / p.price * 100), 0) / propsWithBoth.length;
                          return avgDiff >= 0 ? 'text-emerald-600' : 'text-red-600';
                        })()
                      }`}>
                        {(() => {
                          const propsWithBoth = soldProperties.filter(p => p.price && p.sold_price);
                          if (propsWithBoth.length === 0) return 'N/A';
                          const avgDiff = propsWithBoth.reduce((sum, p) => sum + ((p.sold_price - p.price) / p.price * 100), 0) / propsWithBoth.length;
                          return `${avgDiff >= 0 ? '+' : ''}${avgDiff.toFixed(1)}%`;
                        })()}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="text-xs text-gray-500">This Month</p>
                      <p className="text-lg font-bold text-gray-900">
                        {soldProperties.filter(p => {
                          if (!p.sale_date) return false;
                          const saleDate = new Date(p.sale_date);
                          const now = new Date();
                          return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
                        }).length}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Sold Properties Table */}
              {loadingSold ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto mb-3"></div>
                  <p className="text-gray-500">Loading sold properties...</p>
                </div>
              ) : soldProperties.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No sold properties yet</p>
                  <p className="text-sm mt-1">Properties marked as sold will appear here</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">List Price</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sold Price</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difference</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sale Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {soldProperties.map(property => {
                        const priceDiff = property.price && property.sold_price
                          ? ((property.sold_price - property.price) / property.price * 100)
                          : null;

                        return (
                          <tr key={property.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {property.images?.[0] ? (
                                  <img
                                    src={property.images[0]}
                                    alt={property.location}
                                    className="w-12 h-12 rounded-lg object-cover"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-gray-400" />
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium text-gray-900 text-sm">{property.location}</p>
                                  {property.property_type && (
                                    <span className="text-xs text-gray-500">{property.property_type}</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              <span className="inline-flex items-center gap-2">
                                <span>🛏 {property.beds}</span>
                                <span>🛁 {property.baths}</span>
                                <span>🚗 {property.carpark}</span>
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {formatPrice(property.price)}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-emerald-600">
                              {formatPrice(property.sold_price)}
                            </td>
                            <td className="px-4 py-3">
                              {priceDiff !== null ? (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  priceDiff >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {priceDiff >= 0 ? '+' : ''}{priceDiff.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {property.sale_date ? formatDate(property.sale_date) : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {property.user_email || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
