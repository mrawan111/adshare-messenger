import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, Users, MessageCircle, Clock, Calendar, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import * as XLSX from 'xlsx';

interface MessageStats {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  successRate: number;
  averageResponseTime: number;
  totalContacts: number;
  activeContacts: number;
  messagesPerDay: number;
}

interface DailyStats {
  date: string;
  sent: number;
  delivered: number;
  failed: number;
}

interface ContactActivity {
  contactId: string;
  contactName: string;
  lastMessageDate: string;
  messageCount: number;
  status: 'active' | 'inactive';
}

interface MessageAnalyticsProps {
  contacts: Array<{ id: string; name: string; phone_number: string }>;
  scheduledMessages: Array<{
    id: string;
    status: string;
    processedCount?: number;
    totalCount?: number;
  }>;
}

const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6'];

export function MessageAnalytics({ contacts, scheduledMessages }: MessageAnalyticsProps) {
  const [timeRange, setTimeRange] = useState("7days");
  const [chartType, setChartType] = useState("bar");

  // Calculate statistics
  const stats = useMemo((): MessageStats => {
    const completedMessages = scheduledMessages.filter(msg => msg.status === 'completed');
    const failedMessages = scheduledMessages.filter(msg => msg.status === 'cancelled');
    
    const totalSent = completedMessages.reduce((sum, msg) => sum + (msg.processedCount || 0), 0);
    const totalFailed = failedMessages.reduce((sum, msg) => sum + (msg.totalCount || 0), 0);
    const totalDelivered = totalSent - totalFailed;
    
    const successRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
    
    // Calculate active contacts (contacts that received messages in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activeContacts = contacts.filter(contact => {
      // This would be based on actual message history in a real implementation
      return Math.random() > 0.3; // Mock data
    }).length;

    const messagesPerDay = timeRange === "7days" ? totalSent / 7 : 
                          timeRange === "30days" ? totalSent / 30 : 
                          totalSent / 90;

    return {
      totalSent,
      totalDelivered,
      totalFailed,
      successRate,
      averageResponseTime: 2.5, // Mock data
      totalContacts: contacts.length,
      activeContacts,
      messagesPerDay
    };
  }, [contacts, scheduledMessages, timeRange]);

  // Generate daily stats for charts
  const dailyStats = useMemo((): DailyStats[] => {
    const days = timeRange === "7days" ? 7 : timeRange === "30days" ? 30 : 90;
    const stats: DailyStats[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Mock data - in real implementation, this would come from actual message history
      stats.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sent: Math.floor(Math.random() * 50) + 10,
        delivered: Math.floor(Math.random() * 45) + 8,
        failed: Math.floor(Math.random() * 5)
      });
    }
    
    return stats;
  }, [timeRange]);

  // Generate pie chart data
  const pieData = useMemo(() => [
    { name: 'Delivered', value: stats.totalDelivered, color: '#10b981' },
    { name: 'Failed', value: stats.totalFailed, color: '#ef4444' },
    { name: 'Pending', value: scheduledMessages.filter(m => m.status === 'pending').length, color: '#3b82f6' }
  ], [stats, scheduledMessages]);

  // Generate contact activity data
  const contactActivity = useMemo((): ContactActivity[] => {
    return contacts.slice(0, 10).map(contact => ({
      contactId: contact.id,
      contactName: contact.name,
      lastMessageDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      messageCount: Math.floor(Math.random() * 20) + 1,
      status: Math.random() > 0.3 ? 'active' : 'inactive'
    }));
  }, [contacts]);

  // Export analytics to Excel
  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Summary sheet
      const summaryData = [
        ['Metric', 'Value'],
        ['Total Messages Sent', stats.totalSent],
        ['Total Delivered', stats.totalDelivered],
        ['Total Failed', stats.totalFailed],
        ['Success Rate (%)', stats.successRate.toFixed(2)],
        ['Average Response Time (hours)', stats.averageResponseTime],
        ['Total Contacts', stats.totalContacts],
        ['Active Contacts', stats.activeContacts],
        ['Messages Per Day', stats.messagesPerDay.toFixed(2)]
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

      // Daily stats sheet
      const dailyData = [
        ['Date', 'Sent', 'Delivered', 'Failed'],
        ...dailyStats.map(stat => [stat.date, stat.sent, stat.delivered, stat.failed])
      ];
      const dailyWs = XLSX.utils.aoa_to_sheet(dailyData);
      XLSX.utils.book_append_sheet(wb, dailyWs, 'Daily Stats');

      // Contact activity sheet
      const contactData = [
        ['Contact Name', 'Last Message Date', 'Message Count', 'Status'],
        ...contactActivity.map(contact => [
          contact.contactName,
          contact.lastMessageDate,
          contact.messageCount,
          contact.status
        ])
      ];
      const contactWs = XLSX.utils.aoa_to_sheet(contactData);
      XLSX.utils.book_append_sheet(wb, contactWs, 'Contact Activity');

      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `message_analytics_${timestamp}.xlsx`;

      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error('Error exporting analytics:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Message Analytics</h2>
          <p className="text-muted-foreground">Track your messaging performance and engagement</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportToExcel}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.messagesPerDay.toFixed(1)} per day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalDelivered} delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeContacts}</div>
            <p className="text-xs text-muted-foreground">
              of {stats.totalContacts} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageResponseTime}h</div>
            <p className="text-xs text-muted-foreground">
              response time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Message Volume Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Message Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "bar" ? (
                  <BarChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="sent" fill="#3b82f6" name="Sent" />
                    <Bar dataKey="delivered" fill="#10b981" name="Delivered" />
                    <Bar dataKey="failed" fill="#ef4444" name="Failed" />
                  </BarChart>
                ) : (
                  <LineChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="sent" stroke="#3b82f6" name="Sent" />
                    <Line type="monotone" dataKey="delivered" stroke="#10b981" name="Delivered" />
                    <Line type="monotone" dataKey="failed" stroke="#ef4444" name="Failed" />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex justify-center">
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                  <SelectItem value="line">Line Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Delivery Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contact Activity Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Contact Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="grid grid-cols-4 gap-4 p-4 font-medium border-b bg-muted/50">
              <div>Contact Name</div>
              <div>Last Message</div>
              <div>Message Count</div>
              <div>Status</div>
            </div>
            <div className="divide-y">
              {contactActivity.map((contact) => (
                <div key={contact.contactId} className="grid grid-cols-4 gap-4 p-4">
                  <div className="font-medium">{contact.contactName}</div>
                  <div className="text-sm text-muted-foreground">{contact.lastMessageDate}</div>
                  <div className="text-sm">{contact.messageCount}</div>
                  <div>
                    <Badge variant={contact.status === 'active' ? 'default' : 'secondary'}>
                      {contact.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
