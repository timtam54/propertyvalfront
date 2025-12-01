'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Users, Activity, BarChart3, Clock,
  Globe, FileText, RefreshCw, ChevronDown, ChevronUp,
  Calendar, Eye, TrendingUp
} from 'lucide-react';
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

export default function AdminPage() {
  const router = useRouter();

  // Track page view for audit
  usePageView('admin');

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'activity' | 'reports'>('overview');
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

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'activity') {
      loadAuditRecords();
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

  const loadAuditRecords = async () => {
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
    }
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

  const getMaxVisits = () => {
    if (!stats?.dailyVisits.length) return 1;
    return Math.max(...stats.dailyVisits.map(d => d.count));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Back to App</span>
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'activity', label: 'Activity Log', icon: Activity },
              { id: 'reports', label: 'Reports', icon: FileText }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-cyan-500 text-cyan-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

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
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Reports</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="border border-gray-200 rounded-lg p-4 hover:border-cyan-300 hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-cyan-100 rounded-lg">
                      <Users className="w-5 h-5 text-cyan-600" />
                    </div>
                    <h4 className="font-medium text-gray-900">User Activity Report</h4>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">Summary of all user activity including page visits, login times, and engagement metrics.</p>
                  <p className="text-xs text-gray-400">Export as CSV or PDF</p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 hover:border-cyan-300 hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <BarChart3 className="w-5 h-5 text-green-600" />
                    </div>
                    <h4 className="font-medium text-gray-900">Usage Analytics</h4>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">Detailed analytics on feature usage, popular pages, and user journeys.</p>
                  <p className="text-xs text-gray-400">Export as CSV or PDF</p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 hover:border-cyan-300 hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Calendar className="w-5 h-5 text-purple-600" />
                    </div>
                    <h4 className="font-medium text-gray-900">Monthly Summary</h4>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">Month-over-month comparison of key metrics and growth indicators.</p>
                  <p className="text-xs text-gray-400">Export as CSV or PDF</p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 hover:border-cyan-300 hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Globe className="w-5 h-5 text-orange-600" />
                    </div>
                    <h4 className="font-medium text-gray-900">Geographic Report</h4>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">User distribution by IP location and access patterns.</p>
                  <p className="text-xs text-gray-400">Export as CSV or PDF</p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 hover:border-cyan-300 hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Activity className="w-5 h-5 text-red-600" />
                    </div>
                    <h4 className="font-medium text-gray-900">Audit Trail Export</h4>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">Complete audit log export for compliance and record-keeping.</p>
                  <p className="text-xs text-gray-400">Export as CSV</p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 hover:border-cyan-300 hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <h4 className="font-medium text-gray-900">Property Reports</h4>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">Summary of property evaluations and activities.</p>
                  <p className="text-xs text-gray-400">Export as CSV or PDF</p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-amber-800 text-sm">
                <strong>Note:</strong> Report generation functionality will be available in a future update.
                Currently, you can view all data in the Overview and Activity tabs.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
