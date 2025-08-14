import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Truck, Save, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";

interface Client {
  id: string;
  name: string;
  address: string;
}

interface TransportClient {
  client_id: string;
  delivery_address: string;
  delivery_status: string;
}

interface TransportLog {
  id?: string;
  vehicle_no: string;
  cost: number;
  transport_date: string;
  driver_name: string;
  notes: string;
  clients: TransportClient[];
}

interface TransportLogWithDetails {
  id?: string;
  vehicle_no: string;
  cost: number;
  transport_date: string;
  driver_name: string;
  notes: string;
  clients: TransportClient[];
  transport_clients?: {
    clients: {
      id: string;
      name: string;
      address: string;
    };
    delivery_address: string;
    delivery_status: string;
  }[];
}

export default function TransportLog() {
  const [clients, setClients] = useState<Client[]>([]);
  const [transportLogs, setTransportLogs] = useState<TransportLogWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [currentLog, setCurrentLog] = useState<TransportLog>({
    vehicle_no: "",
    cost: 0,
    transport_date: new Date().toISOString().split('T')[0],
    driver_name: "",
    notes: "",
    clients: []
  });

  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [clientsResult, logsResult] = await Promise.all([
        supabase.from("clients").select("id, name, address").order("name"),
        supabase.from("transport_logs").select(`
          *,
          transport_clients (
            delivery_address,
            delivery_status,
            clients (id, name, address)
          )
        `).order("created_at", { ascending: false })
      ]);

      if (clientsResult.data) setClients(clientsResult.data);
      if (logsResult.data) {
        const formattedLogs = logsResult.data.map(log => ({
          ...log,
          clients: [],
          transport_clients: Array.isArray(log.transport_clients) ? log.transport_clients : []
        }));
        setTransportLogs(formattedLogs);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive",
      });
    }
  };

  const handleClientSelection = (clientId: string, checked: boolean) => {
    const newSelection = new Set(selectedClients);
    if (checked) {
      newSelection.add(clientId);
    } else {
      newSelection.delete(clientId);
    }
    setSelectedClients(newSelection);

    // Update current log clients
    const updatedClients = Array.from(newSelection).map(id => {
      const client = clients.find(c => c.id === id);
      return {
        client_id: id,
        delivery_address: client?.address || "",
        delivery_status: "pending"
      };
    });

    setCurrentLog(prev => ({
      ...prev,
      clients: updatedClients
    }));
  };

  const updateClientDeliveryAddress = (clientId: string, address: string) => {
    setCurrentLog(prev => ({
      ...prev,
      clients: prev.clients.map(client =>
        client.client_id === clientId 
          ? { ...client, delivery_address: address }
          : client
      )
    }));
  };

  const saveTransportLog = async () => {
    if (!currentLog.vehicle_no || selectedClients.size === 0) {
      toast({
        title: "Error",
        description: "Please enter vehicle number and select at least one client",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Save transport log
      const { data: logData, error: logError } = await supabase
        .from("transport_logs")
        .insert({
          vehicle_no: currentLog.vehicle_no,
          cost: currentLog.cost,
          transport_date: currentLog.transport_date,
          driver_name: currentLog.driver_name,
          notes: currentLog.notes
        })
        .select()
        .single();

      if (logError) throw logError;

      // Save transport clients
      const clientsToInsert = currentLog.clients.map(client => ({
        transport_log_id: logData.id,
        client_id: client.client_id,
        delivery_address: client.delivery_address,
        delivery_status: client.delivery_status
      }));

      const { error: clientsError } = await supabase
        .from("transport_clients")
        .insert(clientsToInsert);

      if (clientsError) throw clientsError;

      toast({
        title: "Success",
        description: "Transport log saved successfully",
      });

      // Reset form
      setCurrentLog({
        vehicle_no: "",
        cost: 0,
        transport_date: new Date().toISOString().split('T')[0],
        driver_name: "",
        notes: "",
        clients: []
      });
      setSelectedClients(new Set());
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save transport log",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Transport Log</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transport Log Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              New Transport Entry
            </CardTitle>
            <CardDescription>
              Record vehicle delivery information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vehicle_no">Vehicle Number</Label>
                <Input
                  id="vehicle_no"
                  value={currentLog.vehicle_no}
                  onChange={(e) => setCurrentLog(prev => ({ ...prev, vehicle_no: e.target.value }))}
                  placeholder="MH01AB1234"
                />
              </div>
              <div>
                <Label htmlFor="transport_date">Transport Date</Label>
                <Input
                  id="transport_date"
                  type="date"
                  value={currentLog.transport_date}
                  onChange={(e) => setCurrentLog(prev => ({ ...prev, transport_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="driver_name">Driver Name</Label>
                <Input
                  id="driver_name"
                  value={currentLog.driver_name}
                  onChange={(e) => setCurrentLog(prev => ({ ...prev, driver_name: e.target.value }))}
                  placeholder="Driver name"
                />
              </div>
              <div>
                <Label htmlFor="cost">Transport Cost</Label>
                <Input
                  id="cost"
                  type="number"
                  value={currentLog.cost}
                  onChange={(e) => setCurrentLog(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={currentLog.notes}
                onChange={(e) => setCurrentLog(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
              />
            </div>

            {/* Client Selection */}
            <div>
              <Label>Select Clients for Delivery</Label>
              <div className="max-h-64 overflow-y-auto border rounded-lg p-4 space-y-2">
                {clients.map(client => (
                  <div key={client.id} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={client.id}
                        checked={selectedClients.has(client.id)}
                        onCheckedChange={(checked) => 
                          handleClientSelection(client.id, checked as boolean)
                        }
                      />
                      <Label htmlFor={client.id} className="flex-1">
                        <div className="font-medium">{client.name}</div>
                        <div className="text-sm text-muted-foreground">{client.address}</div>
                      </Label>
                    </div>
                    
                    {selectedClients.has(client.id) && (
                      <div className="ml-6">
                        <Label htmlFor={`address-${client.id}`} className="text-sm">
                          Delivery Address (optional)
                        </Label>
                        <Input
                          id={`address-${client.id}`}
                          placeholder="Custom delivery address"
                          value={
                            currentLog.clients.find(c => c.client_id === client.id)?.delivery_address || client.address
                          }
                          onChange={(e) => updateClientDeliveryAddress(client.id, e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-lg font-semibold">
                Total Cost: {formatCurrency(currentLog.cost)}
              </div>
              <Button onClick={saveTransportLog} disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                Save Transport Log
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transport Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transport Logs</CardTitle>
            <CardDescription>
              Latest vehicle delivery records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transportLogs.slice(0, 10).map((log) => (
                <div key={log.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-lg">{log.vehicle_no}</div>
                      <div className="text-sm text-muted-foreground">
                        Driver: {log.driver_name || 'N/A'} • {new Date(log.transport_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(log.cost)}</div>
                    </div>
                  </div>
                  
                  {log.transport_clients && log.transport_clients.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-1">Deliveries:</div>
                      <div className="space-y-1">
                        {log.transport_clients.map((tc, index) => (
                          <div key={index} className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {tc.clients.name}
                            <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                              tc.delivery_status === 'completed' ? 'bg-green-100 text-green-800' :
                              tc.delivery_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {tc.delivery_status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transport Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transport Summary</CardTitle>
          <CardDescription>
            Detailed view of all transport activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Clients</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transportLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.vehicle_no}</TableCell>
                    <TableCell>{log.driver_name || 'N/A'}</TableCell>
                    <TableCell>
                      {new Date(log.transport_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {log.transport_clients?.map((tc, index) => (
                          <div key={index} className="text-sm">
                            {tc.clients.name}
                          </div>
                        )) || 'No clients'}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(log.cost)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {log.transport_clients?.map((tc, index) => (
                          <div key={index}>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              tc.delivery_status === 'completed' ? 'bg-green-100 text-green-800' :
                              tc.delivery_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {tc.delivery_status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}