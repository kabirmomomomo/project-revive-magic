import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Download, Calendar as CalendarIcon, ArrowLeft, RefreshCw, BarChart3, List, Utensils, Table as TableIcon, User, CreditCard, TrendingUp, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format, subMonths, startOfDay, endOfDay, parseISO } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { toast } from '@/components/ui/sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface OrderAnalytics {
  date: string;
  totalOrders: number;
  totalRevenue: number;
}

interface ItemAnalytics {
  itemName: string;
  quantity: number;
  revenue: number;
}

interface DetailedOrder {
  id: string;
  original_order_id: string;
  created_at: string;
  printed_at: string;
  total_amount: number;
  table_id: string | null;
  session_code: string | null;
  user_name: string | null;
  items: {
    item_name: string;
    quantity: number;
    price: number;
    variant_name: string | null;
  }[];
  payment_mode?: string | null;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const Analytics = () => {
  const { restaurantId } = useParams();
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState<Date>(startOfDay(subMonths(new Date(), 3)));
  const [endDate, setEndDate] = useState<Date>(endOfDay(new Date()));
  const [orderAnalytics, setOrderAnalytics] = useState<OrderAnalytics[]>([]);
  const [itemAnalytics, setItemAnalytics] = useState<ItemAnalytics[]>([]);
  const [detailedOrders, setDetailedOrders] = useState<DetailedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hourlyAnalytics, setHourlyAnalytics] = useState<any[]>([]);
  const [tableAnalytics, setTableAnalytics] = useState<any[]>([]);
  const [orderSearch, setOrderSearch] = useState('');

  useEffect(() => {
    if (startDate && endDate) {
      fetchAnalytics();
    }
  }, [restaurantId, startDate, endDate]);

  const fetchAnalytics = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select valid start and end dates');
      return;
    }

    try {
      setIsLoading(true);

      // Fetch orders from analytics_orders table
      const { data: orders, error: ordersError } = await supabase
        .from('analytics_orders')
        .select(`
          id,
          original_order_id,
          created_at,
          printed_at,
          total_amount,
          table_id,
          session_code,
          user_name,
          items,
          payment_mode
        `)
        .eq('restaurant_id', restaurantId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Process order analytics
      const dailyAnalytics = new Map<string, { totalOrders: number; totalRevenue: number }>();
      const hourlyAnalyticsMap = new Map<string, { totalOrders: number; totalRevenue: number }>();
      const tableAnalyticsMap = new Map<string, { totalOrders: number; totalRevenue: number }>();
      
      orders?.forEach(order => {
        const date = format(new Date(order.created_at), 'yyyy-MM-dd');
        const hour = format(new Date(order.created_at), 'HH:00');
        const tableId = order.table_id || 'No Table';
        
        // Daily analytics
        const currentDaily = dailyAnalytics.get(date) || { totalOrders: 0, totalRevenue: 0 };
        dailyAnalytics.set(date, {
          totalOrders: currentDaily.totalOrders + 1,
          totalRevenue: currentDaily.totalRevenue + order.total_amount,
        });

        // Hourly analytics
        const currentHourly = hourlyAnalyticsMap.get(hour) || { totalOrders: 0, totalRevenue: 0 };
        hourlyAnalyticsMap.set(hour, {
          totalOrders: currentHourly.totalOrders + 1,
          totalRevenue: currentHourly.totalRevenue + order.total_amount,
        });

        // Table analytics
        const currentTable = tableAnalyticsMap.get(tableId) || { totalOrders: 0, totalRevenue: 0 };
        tableAnalyticsMap.set(tableId, {
          totalOrders: currentTable.totalOrders + 1,
          totalRevenue: currentTable.totalRevenue + order.total_amount,
        });
      });

      const orderAnalyticsData = Array.from(dailyAnalytics.entries()).map(([date, data]) => ({
        date,
        ...data,
      }));

      const hourlyAnalyticsData = Array.from(hourlyAnalyticsMap.entries())
        .map(([hour, data]) => ({
          hour,
          ...data,
        }))
        .sort((a, b) => a.hour.localeCompare(b.hour));

      const tableAnalyticsData = Array.from(tableAnalyticsMap.entries())
        .map(([tableId, data]) => ({
          tableId,
          ...data,
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue);

      // Process item analytics
      const itemAnalyticsMap = new Map<string, { quantity: number; revenue: number }>();
      
      orders?.forEach(order => {
        order.items?.forEach(item => {
          const current = itemAnalyticsMap.get(item.item_name) || { quantity: 0, revenue: 0 };
          itemAnalyticsMap.set(item.item_name, {
            quantity: current.quantity + item.quantity,
            revenue: current.revenue + (item.price * item.quantity),
          });
        });
      });

      const itemAnalyticsData = Array.from(itemAnalyticsMap.entries())
        .map(([itemName, data]) => ({
          itemName,
          ...data,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10); // Top 10 items by revenue

      setOrderAnalytics(orderAnalyticsData);
      setItemAnalytics(itemAnalyticsData);
      setDetailedOrders(orders || []);
      setHourlyAnalytics(hourlyAnalyticsData);
      setTableAnalytics(tableAnalyticsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    try {
      // Prepare order data for CSV
      const orderData = orderAnalytics.map(day => ({
        Date: day.date,
        'Total Orders': day.totalOrders,
        'Total Revenue': day.totalRevenue.toFixed(2),
      }));

      // Prepare item data for CSV
      const itemData = itemAnalytics.map(item => ({
        'Item Name': item.itemName,
        'Quantity Sold': item.quantity,
        'Total Revenue': item.revenue.toFixed(2),
      }));

      // Prepare detailed order data for CSV
      const detailedOrderData = detailedOrders.map(order => ({
        'Order ID': order.id,
        'Date': format(new Date(order.created_at), 'yyyy-MM-dd HH:mm:ss'),
        'Table': order.table_id || 'N/A',
        'Session': order.session_code || 'N/A',
        'Customer': order.user_name || 'N/A',
        'Total Amount': order.total_amount.toFixed(2),
        'Payment Mode': order.payment_mode || 'N/A',
        'Items': order.items.map(item => 
          `${item.item_name}${item.variant_name ? ` (${item.variant_name})` : ''} x${item.quantity} @$${item.price}`
        ).join('; '),
      }));

      // Convert to CSV
      const orderCSV = [
        Object.keys(orderData[0]).join(','),
        ...orderData.map(row => Object.values(row).join(','))
      ].join('\n');

      const itemCSV = [
        Object.keys(itemData[0]).join(','),
        ...itemData.map(row => Object.values(row).join(','))
      ].join('\n');

      const detailedOrderCSV = [
        Object.keys(detailedOrderData[0]).join(','),
        ...detailedOrderData.map(row => Object.values(row).join(','))
      ].join('\n');

      // Create and download files
      const orderBlob = new Blob([orderCSV], { type: 'text/csv' });
      const itemBlob = new Blob([itemCSV], { type: 'text/csv' });
      const detailedOrderBlob = new Blob([detailedOrderCSV], { type: 'text/csv' });

      const orderUrl = URL.createObjectURL(orderBlob);
      const itemUrl = URL.createObjectURL(itemBlob);
      const detailedOrderUrl = URL.createObjectURL(detailedOrderBlob);

      const orderLink = document.createElement('a');
      orderLink.href = orderUrl;
      orderLink.download = `order-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(orderLink);
      orderLink.click();
      document.body.removeChild(orderLink);

      const itemLink = document.createElement('a');
      itemLink.href = itemUrl;
      itemLink.download = `item-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(itemLink);
      itemLink.click();
      document.body.removeChild(itemLink);

      const detailedOrderLink = document.createElement('a');
      detailedOrderLink.href = detailedOrderUrl;
      detailedOrderLink.download = `detailed-orders-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(detailedOrderLink);
      detailedOrderLink.click();
      document.body.removeChild(detailedOrderLink);

      toast.success('Analytics data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export analytics data');
    }
  };

  const filteredOrders = detailedOrders.filter(order => {
    if (!orderSearch.trim()) return true;
    const search = orderSearch.trim().toLowerCase();
    return (
      (order.original_order_id && order.original_order_id.toLowerCase().includes(search)) ||
      (order.session_code && order.session_code.toLowerCase().includes(search))
    );
  });

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-white to-purple-50 px-0 md:px-4 py-0 md:py-6">
      <div className="w-full max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-center px-4 md:px-8 pt-6 pb-4 bg-white/80 rounded-b-xl shadow-sm border-b border-gray-200 sticky top-0 z-30 backdrop-blur-md">
          <div className="flex items-center gap-3 mb-2 md:mb-0">
            <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="h-9 w-9 bg-blue-50 hover:bg-blue-100 border-blue-100">
              <ArrowLeft className="h-5 w-5 text-blue-600" />
            </Button>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-blue-900 flex items-center gap-2">
              <BarChart3 className="h-7 w-7 text-purple-500 mr-1" /> Analytics Dashboard
            </h1>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {/* Date pickers */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[140px] md:w-[180px] justify-start text-left font-normal bg-white border-gray-200", !startDate && "text-muted-foreground")}> <CalendarIcon className="mr-2 h-4 w-4 text-blue-500" /> {startDate ? format(startDate, "PPP") : "Start date"} </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={startDate} onSelect={(date) => date && setStartDate(startOfDay(date))} initialFocus />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[140px] md:w-[180px] justify-start text-left font-normal bg-white border-gray-200", !endDate && "text-muted-foreground")}> <CalendarIcon className="mr-2 h-4 w-4 text-blue-500" /> {endDate ? format(endDate, "PPP") : "End date"} </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={endDate} onSelect={(date) => date && setEndDate(endOfDay(date))} initialFocus disabled={(date) => date < startDate} />
              </PopoverContent>
            </Popover>
            <Button variant="outline" onClick={fetchAnalytics} className="bg-white border border-gray-200 hover:bg-blue-50 text-blue-700 font-semibold flex gap-2">
              <RefreshCw className="h-4 w-4 text-blue-500" /> Refresh
            </Button>
            <Button onClick={exportToCSV} className="bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold shadow-md hover:from-purple-600 hover:to-blue-600 flex gap-2">
              <Download className="h-4 w-4" /> Export Data
            </Button>
          </div>
        </div>
        <div className="border-b border-gray-200 w-full mb-2" />
        {/* Main Content */}
        <div className="w-full px-1 md:px-4 pt-2 md:pt-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              <Tabs defaultValue="overview" className="mb-8 sticky top-[70px] z-20 bg-white/80 backdrop-blur-md rounded-t-xl shadow-sm">
                <TabsList className="w-full flex gap-2 md:gap-4 bg-white/90 border-b border-gray-200 rounded-t-xl px-2 md:px-6 py-2 sticky top-0 z-20">
                  <TabsTrigger value="overview" className="flex items-center gap-1 text-blue-700 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-900"><BarChart3 className="h-4 w-4" /> Overview</TabsTrigger>
                  <TabsTrigger value="orders" className="flex items-center gap-1 text-purple-700 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-900"><List className="h-4 w-4" /> Orders</TabsTrigger>
                  <TabsTrigger value="items" className="flex items-center gap-1 text-green-700 data-[state=active]:bg-green-50 data-[state=active]:text-green-900"><Utensils className="h-4 w-4" /> Items</TabsTrigger>
                  <TabsTrigger value="tables" className="flex items-center gap-1 text-yellow-700 data-[state=active]:bg-yellow-50 data-[state=active]:text-yellow-900"><TableIcon className="h-4 w-4" /> Tables</TabsTrigger>
                </TabsList>
                {/* Overview Tab */}
                <TabsContent value="overview">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
                    <Card className="border border-blue-100 shadow-sm hover:shadow-lg transition-all bg-white/90">
                      <CardHeader className="flex flex-row items-center gap-2 pb-2">
                        <BarChart3 className="h-5 w-5 text-blue-500 mr-1" />
                        <CardTitle className="text-base font-semibold">Total Orders</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-extrabold text-blue-700">{orderAnalytics.reduce((sum, day) => sum + day.totalOrders, 0)}</p>
                      </CardContent>
                    </Card>
                    <Card className="border border-purple-100 shadow-sm hover:shadow-lg transition-all bg-white/90">
                      <CardHeader className="flex flex-row items-center gap-2 pb-2">
                        <CreditCard className="h-5 w-5 text-purple-500 mr-1" />
                        <CardTitle className="text-base font-semibold">Total Revenue</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-extrabold text-purple-700">${orderAnalytics.reduce((sum, day) => sum + day.totalRevenue, 0).toFixed(2)}</p>
                      </CardContent>
                    </Card>
                    <Card className="border border-green-100 shadow-sm hover:shadow-lg transition-all bg-white/90">
                      <CardHeader className="flex flex-row items-center gap-2 pb-2">
                        <TrendingUp className="h-5 w-5 text-green-500 mr-1" />
                        <CardTitle className="text-base font-semibold">Average Order Value</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-extrabold text-green-700">${(orderAnalytics.reduce((sum, day) => sum + day.totalRevenue, 0) / orderAnalytics.reduce((sum, day) => sum + day.totalOrders, 0) || 0).toFixed(2)}</p>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
                    <Card className="border border-gray-100 shadow-sm hover:shadow-lg transition-all bg-white/90">
                      <CardHeader className="flex flex-row items-center gap-2 pb-2"><BarChart3 className="h-5 w-5 text-blue-500 mr-1" /><CardTitle className="text-base font-semibold">Daily Orders & Revenue</CardTitle></CardHeader>
                      <CardContent><div className="h-[300px] md:h-[400px]"> <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={orderAnalytics}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip />
                          <Legend />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="totalOrders"
                            stroke="#8884d8"
                            name="Orders"
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="totalRevenue"
                            stroke="#82ca9d"
                            name="Revenue"
                          />
                        </LineChart>
                      </ResponsiveContainer></div></CardContent>
                    </Card>
                    <Card className="border border-gray-100 shadow-sm hover:shadow-lg transition-all bg-white/90">
                      <CardHeader className="flex flex-row items-center gap-2 pb-2"><BarChart3 className="h-5 w-5 text-purple-500 mr-1" /><CardTitle className="text-base font-semibold">Hourly Order Distribution</CardTitle></CardHeader>
                      <CardContent><div className="h-[300px] md:h-[400px]"> <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={hourlyAnalytics}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="hour" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="totalOrders" fill="#8884d8" name="Orders" />
                        </BarChart>
                      </ResponsiveContainer></div></CardContent>
                    </Card>
                  </div>
                </TabsContent>
                {/* Orders Tab */}
                <TabsContent value="orders">
                  <Card className="mb-8 border border-purple-100 shadow-sm hover:shadow-lg transition-all bg-white/90">
                    <CardHeader className="flex flex-row items-center gap-2 pb-2">
                      <List className="h-5 w-5 text-purple-500 mr-1" />
                      <CardTitle className="text-base font-semibold">Detailed Order History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Search Bar */}
                      <div className="flex flex-col md:flex-row md:items-center gap-2 mb-4">
                        <div className="flex w-full max-w-xs items-center border border-gray-200 rounded-lg bg-white px-2 py-1 shadow-sm">
                          <input
                            type="text"
                            placeholder="Search by Order ID or Session Number..."
                            value={orderSearch}
                            onChange={e => setOrderSearch(e.target.value)}
                            className="flex-1 bg-transparent outline-none px-2 py-1 text-sm text-gray-700"
                          />
                          <button type="button" className="p-1 text-purple-500 hover:text-purple-700">
                            <Search className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-gray-100">
                        <Table>
                          <TableHeader className="bg-purple-50">
                            <TableRow>
                              <TableHead>Order ID</TableHead>
                              <TableHead>Date & Time</TableHead>
                              <TableHead>Table</TableHead>
                              <TableHead>Session</TableHead>
                              <TableHead>Customer</TableHead>
                              <TableHead>Payment Mode</TableHead>
                              <TableHead>Items</TableHead>
                              <TableHead className="text-right">Total Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredOrders.map((order) => (
                              <TableRow key={order.id} className="hover:bg-purple-50/60 transition-all">
                                <TableCell className="font-medium">{order.original_order_id}</TableCell>
                                <TableCell>{format(new Date(order.created_at), 'yyyy-MM-dd HH:mm:ss')}</TableCell>
                                <TableCell>{order.table_id || <span className="text-gray-400">N/A</span>}</TableCell>
                                <TableCell>{order.session_code || <span className="text-gray-400">N/A</span>}</TableCell>
                                <TableCell className="flex items-center gap-1"> <User className="h-4 w-4 text-blue-400" /> {order.user_name || <span className="text-gray-400">N/A</span>} </TableCell>
                                <TableCell>{order.payment_mode || <span className="text-gray-400">N/A</span>}</TableCell>
                                <TableCell>
                                  <div className="max-w-xs md:max-w-md">
                                    {order.items.map((item, index) => (
                                      <div key={index} className="text-xs md:text-sm text-gray-700">
                                        {item.name}
                                        {item.variant_name && ` (${item.variant_name})`} x{item.quantity} @${item.price}
                                      </div>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-semibold text-purple-700">${order.total_amount.toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                {/* Items Tab */}
                <TabsContent value="items">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
                    <Card className="border border-green-100 shadow-sm hover:shadow-lg transition-all bg-white/90">
                      <CardHeader className="flex flex-row items-center gap-2 pb-2"><Utensils className="h-5 w-5 text-green-500 mr-1" /><CardTitle className="text-base font-semibold">Top Items by Revenue</CardTitle></CardHeader>
                      <CardContent><div className="h-[300px] md:h-[400px]"> <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={itemAnalytics}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="itemName" angle={-45} textAnchor="end" height={100} />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
                          <Bar dataKey="quantity" fill="#82ca9d" name="Quantity" />
                        </BarChart>
                      </ResponsiveContainer></div></CardContent>
                    </Card>
                    <Card className="border border-yellow-100 shadow-sm hover:shadow-lg transition-all bg-white/90">
                      <CardHeader className="flex flex-row items-center gap-2 pb-2"><Utensils className="h-5 w-5 text-yellow-500 mr-1" /><CardTitle className="text-base font-semibold">Item Distribution</CardTitle></CardHeader>
                      <CardContent><div className="h-[300px] md:h-[400px]"> <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={itemAnalytics}
                            dataKey="revenue"
                            nameKey="itemName"
                            cx="50%"
                            cy="50%"
                            outerRadius={150}
                            label
                          >
                            {itemAnalytics.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer></div></CardContent>
                    </Card>
                  </div>
                </TabsContent>
                {/* Tables Tab */}
                <TabsContent value="tables">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
                    <Card className="border border-yellow-100 shadow-sm hover:shadow-lg transition-all bg-white/90">
                      <CardHeader className="flex flex-row items-center gap-2 pb-2"><TableIcon className="h-5 w-5 text-yellow-500 mr-1" /><CardTitle className="text-base font-semibold">Table Performance</CardTitle></CardHeader>
                      <CardContent><div className="h-[300px] md:h-[400px]"> <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={tableAnalytics}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="tableId" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="totalOrders" fill="#8884d8" name="Orders" />
                          <Bar dataKey="totalRevenue" fill="#82ca9d" name="Revenue" />
                        </BarChart>
                      </ResponsiveContainer></div></CardContent>
                    </Card>
                    <Card className="border border-blue-100 shadow-sm hover:shadow-lg transition-all bg-white/90">
                      <CardHeader className="flex flex-row items-center gap-2 pb-2"><TableIcon className="h-5 w-5 text-blue-500 mr-1" /><CardTitle className="text-base font-semibold">Table Revenue Distribution</CardTitle></CardHeader>
                      <CardContent><div className="h-[300px] md:h-[400px]"> <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={tableAnalytics}
                            dataKey="totalRevenue"
                            nameKey="tableId"
                            cx="50%"
                            cy="50%"
                            outerRadius={150}
                            label
                          >
                            {tableAnalytics.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer></div></CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics; 