import { useCallback, useState, useEffect } from "react"
import {
  Users,
  Table2,
  Terminal,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  Database,
  Key,
  Copy,
  Check,
  Trash2,
  Ban,
  Shield,
  HardDrive,
  Cpu,
  MoreVertical,
  Search,
  Loader,
  Plus,
  X,
  FileCode,
  Mail,
  Sparkles,
  Save,
  Bell,
  ShieldCheck,
  Lock,
  Github,
  Globe,
  FileText,
  MessageSquare,
  BarChart3,
  Eye,
  EyeOff
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "../ui/badge"
import { SignupChart } from "./signup-chart"
import { AuthProviders } from "./auth-providers"
import { McpConnectModal } from "@/components/project/McpConnectModal"
import Link from "next/link"
import dynamic from "next/dynamic"

import { useWorkbench } from "@/lib/workbench-context"

const Editor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.Editor),
  { ssr: false }
)

const DEFAULT_TEMPLATES = {
  confirmation: {
    subject: "Confirm your signup",
    content: `<h2>Confirm your signup</h2>
<p>Follow this link to confirm your user:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your mail</a></p>`
  },
  invite: {
    subject: "You have been invited",
    content: `<h2>You have been invited</h2>
<p>You have been invited to join the application. Follow this link to accept the invite:</p>
<p><a href="{{ .ConfirmationURL }}">Accept invite</a></p>`
  },
  magic_link: {
    subject: "Your Magic Link",
    content: `<h2>Your Magic Link</h2>
<p>Follow this link to login:</p>
<p><a href="{{ .ConfirmationURL }}">Log In</a></p>`
  },
  email_change: {
    subject: "Confirm Email Change",
    content: `<h2>Confirm Email Change</h2>
<p>Follow this link to confirm your new email:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm Email Change</a></p>`
  },
  recovery: {
    subject: "Reset Password",
    content: `<h2>Reset Password</h2>
<p>Follow this link to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>`
  },
  reauthentication: {
    subject: "Confirm reauthentication",
    content: `<h2>Confirm reauthentication</h2>
<p>Enter this code to reauthenticate:</p>
<p><b>{{ .Token }}</b></p>`
  }
}

interface DatabasePanelProps {
  projectId: string
  filesOverride?: Array<{ path: string; content: string; language: string }>
  onSendMessage?: (message: string) => void
}

interface SupabaseUser {
  id: string
  email: string
  name: string | null
  role: string
  createdAt: string
  updatedAt?: string | null
  invitedAt?: string | null
  confirmedAt?: string | null
  lastSignIn: string | null
  confirmed?: boolean
  banned?: boolean
  provider?: string | null
}

interface TableColumn {
  name: string
  type: string
  nullable: boolean
  default: string | null
}

interface TableInfo {
  name: string
  schema: string
  columns: TableColumn[]
}

interface SQLFile {
  id: string
  fileName: string
  content: string
  createdAt: string
  source?: 'supabase' | 'neon'
}

interface ConnectionData {
  supabaseUrl: string
  anonKey: string
  serviceRoleKey?: string
  projectRef?: string
  projectName?: string
  neonUrl?: string
}

type TabType = "tables" | "users" | "sql" | "emails" | "storage" | "functions" | "credentials" | "auth_providers" | "ai" | "usage"

export function DatabasePanel({ projectId, filesOverride, onSendMessage }: DatabasePanelProps) {
  const { databaseTab: activeTab, setDatabaseTab: setActiveTab } = useWorkbench()
  const [users, setUsers] = useState<SupabaseUser[]>([])
  const [tables, setTables] = useState<TableInfo[]>([])
  const [sqlFiles, setSqlFiles] = useState<SQLFile[]>([])
  const [selectedSqlFile, setSelectedSqlFile] = useState<SQLFile | null>(null)
  const [authConfig, setAuthConfig] = useState<any>(null)
  const [authConfigError, setAuthConfigError] = useState<string | null>(null)
  const [selectedEmailTemplate, setSelectedEmailTemplate] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<any[]>([])
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null)
  const [replyText, setReplyText] = useState("")
  const [sendingReply, setSendingReply] = useState(false)
  const [resendKey, setResendKey] = useState("")
  const [aiUsage, setAiUsage] = useState<{
    balance: number,
    totalMessages: number,
    totalCost: number,
    projectKey: string | null,
    tier: string
  } | null>(null)
  const [loadingUsage, setLoadingUsage] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)

  // Fetch SQL history
  const fetchSqlHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/sql-history`)
      if (res.ok) {
        const data = await res.json()
        setSqlFiles(data.history || [])
      }
    } catch (err) {
      console.error("SQL History fetch error:", err)
    }
  }, [projectId])

  const [aiPrompt, setAiPrompt] = useState("")
  const [isAiEditing, setIsAiEditing] = useState(false)
  const [storage, setStorage] = useState<any[]>([])
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null)
  const [bucketFiles, setBucketFiles] = useState<any[]>([])
  const [selectedFile, setSelectedFile] = useState<any | null>(null)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [functions, setFunctions] = useState<any[]>([])
  const [selectedFunction, setSelectedFunction] = useState<any | null>(null)
  const [functionDetailTab, setFunctionDetailTab] = useState<string>("overview")
  const [loading, setLoading] = useState(false)
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null)
  const [tableRows, setTableRows] = useState<any[]>([])
  const [loadingTableData, setLoadingTableData] = useState(false)
  const [selectedUser, setSelectedUser] = useState<SupabaseUser | null>(null)
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserPassword, setNewUserPassword] = useState("")
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [tableSearchTerm, setTableSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"code" | "preview">("code")

  const [connectionStatus, setConnectionStatus] = useState<{ connected: boolean; connection?: ConnectionData; type?: 'supabase' | 'neon' } | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // Check connection status
  const checkConnection = useCallback(async () => {
    try {
      setLoading(true)
      // 1. Try to get project-specific credentials (for managed databases)
      // Check Supabase first
      const projectRes = await fetch(`/api/projects/${projectId}/supabase`)
      const projectData = await projectRes.json()

      if (projectData && projectData.supabaseUrl && projectData.anonKey) {
        setConnectionStatus({
          connected: true,
          type: 'supabase',
          connection: {
            supabaseUrl: projectData.supabaseUrl,
            anonKey: projectData.anonKey,
            projectName: "Managed Database (Supabase)",
            projectRef: projectData.supabaseUrl.split("//")[1]?.split(".")[0],
          }
        })
        setConnectionError(null)
        return
      }

      // Check Neon
      const neonRes = await fetch(`/api/projects/${projectId}/neon`)
      if (neonRes.ok) {
        const neonData = await neonRes.json()
        if (neonData && neonData.databaseUrl) {
          setConnectionStatus({
            connected: true,
            type: 'neon',
            connection: {
              supabaseUrl: "",
              anonKey: "",
              neonUrl: neonData.databaseUrl,
              projectName: "Managed Database (Neon)",
              projectRef: neonData.projectRef,
            }
          })
          setConnectionError(null)
          return
        }
      }

      // 2. Fallback to global user connection
      const res = await fetch("/api/user/supabase-connection")
      if (!res.ok) throw new Error("Failed to fetch connection status")
      const data = await res.json()
      setConnectionStatus({ ...data, type: 'supabase' })
      setConnectionError(null)
    } catch (error) {
      setConnectionError("Failed to check database connection status")
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (projectId) {
      checkConnection()
      fetchSqlHistory()
    }
  }, [projectId, fetchSqlHistory, checkConnection])

  // Fetch users
  const fetchUsers = useCallback(async () => {
    if (!connectionStatus?.connected) return;
    try {
      const type = connectionStatus.type || 'supabase';
      const res = await fetch(`/api/projects/${projectId}/${type}/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error("Users fetch error:", err);
    }
  }, [projectId, connectionStatus?.connected, connectionStatus?.type]);

  // Fetch tables
  const fetchTables = useCallback(async () => {
    if (!connectionStatus?.connected) return;
    try {
      const type = connectionStatus.type || 'supabase';
      const res = await fetch(`/api/projects/${projectId}/${type}/tables`);
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables || []);
      }
    } catch (err) {
      console.error("Tables fetch error:", err);
    }
  }, [projectId, connectionStatus?.connected, connectionStatus?.type]);

  // Fetch table rows
  const fetchTableRows = useCallback(async (tableName: string) => {
    setLoadingTableData(true)
    try {
      const type = connectionStatus?.type || 'supabase';
      const res = await fetch(`/api/projects/${projectId}/${type}/tables/${tableName}/data`)
      if (res.ok) {
        const data = await res.json()
        setTableRows(data.rows || [])
      }
    } catch (err) {
      console.error("Rows fetch error:", err)
    } finally {
      setLoadingTableData(false)
    }
  }, [projectId, connectionStatus?.type])

  useEffect(() => {
    if (selectedTable) {
      fetchTableRows(selectedTable.name)
    } else {
      setTableRows([])
    }
  }, [selectedTable, fetchTableRows])

  // Fetch storage
  const fetchStorage = useCallback(async () => {
    if (!connectionStatus?.connected) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/supabase/storage`);
      if (res.ok) {
        const data = await res.json();
        setStorage(data.buckets || []);
      }
    } catch (err) {
      console.error("Storage fetch error:", err);
    }
  }, [projectId, connectionStatus?.connected]);

  // Fetch AI usage
  const fetchAiUsage = useCallback(async () => {
    try {
      setLoadingUsage(true)
      const res = await fetch(`/api/ai/usage?projectId=${projectId}`)
      if (res.ok) {
        const data = await res.json()
        setAiUsage(data)
      }
    } catch (error) {
      console.error("AI Usage fetch error:", error)
    } finally {
      setLoadingUsage(false)
    }
  }, [projectId])

  // Fetch feedback
  const fetchFeedback = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/feedback`);
      if (res.ok) {
        const data = await res.json();
        setFeedback(data || []);
      }
    } catch (err) {
      console.error("Feedback fetch error:", err);
    }
  }, [projectId]);

  // Fetch functions
  const fetchFunctions = useCallback(async () => {
    if (!connectionStatus?.connected) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/supabase/functions`);
      if (res.ok) {
        const data = await res.json();
        setFunctions(data.functions || []);
      }
    } catch (err) {
      console.error("Functions fetch error:", err);
    }
  }, [projectId, connectionStatus?.connected]);

  // Fetch SQL Files
  const fetchSqlFiles = useCallback(async () => {
    if (!connectionStatus?.connected) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/supabase/sql-files`);
      if (res.ok) {
        const data = await res.json();
        // Skip setting if we are using the new sqlHistory
        // setSqlFiles(data || []);
      }
    } catch (err) {
      console.error("SQL Files fetch error:", err);
    }
  }, [projectId, connectionStatus?.connected]);

  // Fetch bucket files
  const fetchBucketFiles = useCallback(async (bucketName: string) => {
    setLoadingFiles(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/supabase/storage/${bucketName}`);
      if (res.ok) {
        const data = await res.json();
        setBucketFiles(data.files || []);
      }
    } catch (err) {
      console.error("Bucket files fetch error:", err);
    } finally {
      setLoadingFiles(false)
    }
  }, [projectId]);

  // Load files when bucket is selected
  useEffect(() => {
    if (selectedBucket) {
      fetchBucketFiles(selectedBucket)
    } else {
      setBucketFiles([])
      setSelectedFile(null)
    }
  }, [selectedBucket, fetchBucketFiles])

  // Fetch Auth Config
  const fetchAuthConfig = useCallback(async () => {
    if (!connectionStatus?.connected) return;
    setAuthConfigError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/supabase/auth/config`);
      if (res.ok) {
        const data = await res.json();
        setAuthConfig(data);
      } else {
        let errMsg = "Failed to load auth configuration";
        try {
          const errData = await res.json();
          errMsg = errData.error || errMsg;
        } catch (e) {
          try {
            errMsg = await res.text() || errMsg;
          } catch (e2) { }
        }
        setAuthConfigError(errMsg);
      }
    } catch (err) {
      console.error("Auth config fetch error:", err);
      setAuthConfigError("Network error while loading auth configuration");
    }
  }, [projectId, connectionStatus?.connected]);

  const handleAiEditTemplate = async (templateId?: string) => {
    if (!aiPrompt || !authConfig) return
    setIsAiEditing(true)
    try {
      const template = templateId || selectedEmailTemplate
      if (!template) {
        setIsAiEditing(false)
        return
      }
      const subjectKey = `mailer_templates_${template}_subject`
      const bodyKey = `mailer_templates_${template}_content`
      const subject = authConfig[subjectKey] || ""
      const body = authConfig[bodyKey] || ""

      const res = await fetch(`/api/projects/${projectId}/supabase/auth/ai-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, subject, body, templateType: template })
      })

      if (res.ok) {
        const data = await res.json()
        const newConfig = {
          ...authConfig,
          [subjectKey]: data.subject,
          [bodyKey]: data.body
        }
        setAuthConfig(newConfig)
        setAiPrompt("")
        if (!selectedEmailTemplate) setSelectedEmailTemplate(template)
        alert("Template updated by AI. Don't forget to save changes to the server.")
      } else {
        const errorData = await res.json()
        alert(errorData.error || "AI edit failed")
      }
    } catch (err) {
      alert("AI edit error")
    } finally {
      setIsAiEditing(false)
    }
  }

  const handleResetTemplates = async () => {
    if (!confirm("Are you sure you want to reset all templates to their defaults? This will overwrite your current changes.")) return

    setLoading(true)
    try {
      const configToSave: any = {}
      Object.entries(DEFAULT_TEMPLATES).forEach(([id, template]) => {
        configToSave[`mailer_templates_${id}_subject`] = template.subject
        configToSave[`mailer_templates_${id}_content`] = template.content
      })

      const res = await fetch(`/api/projects/${projectId}/supabase/auth/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configToSave)
      })

      if (res.ok) {
        setAuthConfig({ ...authConfig, ...configToSave })
        alert("All templates reset to defaults successfully")
      } else {
        const data = await res.json()
        alert(data.error || "Failed to reset templates")
      }
    } catch (err) {
      alert("Error resetting templates")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAuthConfig = async () => {
    if (!authConfig) return
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/supabase/auth/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [`mailer_templates_${selectedEmailTemplate}_subject`]: authConfig[`mailer_templates_${selectedEmailTemplate}_subject`],
          [`mailer_templates_${selectedEmailTemplate}_content`]: authConfig[`mailer_templates_${selectedEmailTemplate}_content`]
        })
      })
      if (res.ok) {
        alert("Auth configuration saved successfully")
      } else {
        const data = await res.json()
        alert(data.error || "Failed to save configuration")
      }
    } catch (err) {
      alert("Error saving Auth configuration")
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    if (connectionStatus?.connected) {
      setLoading(true)
      Promise.all([
        fetchTables(),
        fetchUsers(),
        fetchStorage(),
        fetchFunctions(),
        fetchSqlFiles(),
      ]).finally(() => setLoading(false))
    }
  }, [connectionStatus?.connected, fetchTables, fetchUsers, fetchStorage, fetchFunctions, fetchSqlFiles, fetchAuthConfig])

  useEffect(() => {
    if (projectId) {
      fetchFeedback()
      fetchAiUsage()
    }
  }, [projectId, fetchFeedback, fetchAiUsage])

  const refresh = useCallback(async () => {
    setLoading(true)
    if (activeTab === "users") await fetchUsers()
    else if (activeTab === "tables") await fetchTables()
    else if (activeTab === "storage") await fetchStorage()
    else if (activeTab === "functions") await fetchFunctions()
    else if (activeTab === "sql") await fetchSqlFiles()
    else if (activeTab === "emails") await fetchAuthConfig()
    else if (activeTab === "feedback") await fetchFeedback()
    else if (activeTab === "ai" || activeTab === "usage") await fetchAiUsage()
    setLoading(false)
  }, [activeTab, fetchUsers, fetchTables, fetchStorage, fetchFunctions, fetchSqlFiles, fetchAuthConfig, fetchFeedback, fetchAiUsage])

  const filteredTables = tables.filter(t =>
    t.name.toLowerCase().includes(tableSearchTerm.toLowerCase())
  )

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/supabase/users`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "delete" })
      })
      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId))
        alert("User deleted")
      } else {
        const data = await res.json()
        alert(data.error || "Failed to delete user")
      }
    } catch (err) {
      alert("Error deleting user")
    } finally {
      setLoading(false)
    }
  }

  const handleBanUser = async (userId: string, isBanned: boolean) => {
    setLoading(true)
    try {
      const action = isBanned ? "unban" : "ban"
      const res = await fetch(`/api/projects/${projectId}/supabase/users`, {
        method: "POST", // Using POST for actions
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action })
      })
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, banned: !isBanned } : u))
        if (selectedUser?.id === userId) setSelectedUser(prev => prev ? { ...prev, banned: !isBanned } : null)
        alert(`User ${action}ned`)
      } else {
        const data = await res.json()
        alert(data.error || `Failed to ${action} user`)
      }
    } catch (err) {
      alert("Error processing user action")
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (email: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/supabase/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action: "reset_password" })
      })
      if (res.ok) {
        alert("Password reset link generated. Check console/logs for link in development.")
      } else {
        const data = await res.json()
        alert(data.error || "Failed to generate reset link")
      }
    } catch (err) {
      alert("Error resetting password")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword) return
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/supabase/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newUserEmail, password: newUserPassword, action: "create" })
      })
      if (res.ok) {
        await fetchUsers()
        setShowAddUserModal(false)
        setNewUserEmail("")
        setNewUserPassword("")
        alert("User created successfully")
      } else {
        const data = await res.json()
        alert(data.error || "Failed to create user")
      }
    } catch (err) {
      alert("Error creating user")
    } finally {
      setLoading(false)
    }
  }

  const handleSendReply = async () => {
    if (!selectedFeedback || !replyText) return
    setSendingReply(true)
    try {
      if (resendKey) {
        localStorage.setItem(`falbor_resend_api_key_${projectId}`, resendKey)
      }

      const res = await fetch(`/api/projects/${projectId}/feedback/${selectedFeedback.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: replyText, resendKey })
      })
      if (res.ok) {
        const data = await res.json()
        alert(data.emailSent ? "Reply sent successfully via Resend!" : `Reply saved to database, but failed to send email: ${data.emailError || "Unknown error"}. Please check your Resend API Key.`)
        setReplyText("")
        await fetchFeedback()
        setSelectedFeedback(null)
      } else {
        const data = await res.json()
        alert(data.error || "Failed to send reply")
      }
    } catch (err) {
      alert("Error sending reply")
    } finally {
      setSendingReply(false)
    }
  }

  const copyToClipboard = async (text: string | null | undefined, field: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const filteredUsers = users.filter(u =>
    (u.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  const connection = connectionStatus?.connection

  return (
    <div className="flex h-full w-full bg-white font-sans text-gray-900 overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-auto relative py-8 px-6">
          <div className="max-w-5xl mx-auto w-full">
            {activeTab === "tables" && (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-md text-gray-900 font-bold">Database</h3>
                    <p className="text-[12px] text-gray-500">Manage and browse your database tables.</p>
                  </div>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Filter tables..."
                      value={tableSearchTerm}
                      onChange={(e) => setTableSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-1.5 bg-white h-7 border rounded-md text-xs focus:bg-white focus:border-blue-200 outline-none transition-all w-32 md:w-48"
                    />
                  </div>
                </div>

                {filteredTables.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                      <Table2 className="w-8 h-8 text-gray-200" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-900">{tableSearchTerm ? "No matching tables" : "No tables found"}</h4>
                    <p className="text-xs text-gray-500 mt-1 max-w-[240px]">
                      {tableSearchTerm ? "Try a different search term." : "AI will automatically create tables based on your requirements."}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {filteredTables.map((table) => (
                      <div
                        key={table.name}
                        onClick={() => setSelectedTable(selectedTable?.name === table.name ? null : table)}
                        className={cn(
                          "group bg-white border rounded-md p-4 cursor-pointer hover:border-blue-200 transition-all",
                          selectedTable?.name === table.name ? "border-blue-200 shadow-sm" : "border-gray-100"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                              <Table2 className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-sm font-bold">{table.name}</span>
                              <span className="text-[10px] ml-2 text-gray-400 font-medium uppercase tracking-tighter">{table.columns.length} columns</span>
                            </div>
                          </div>
                          <ChevronRight className={cn("w-4 h-4 text-gray-300 transition-transform duration-200", selectedTable?.name === table.name && "rotate-90 text-blue-600")} />
                        </div>

                        {selectedTable?.name === table.name && (
                          <div className="mt-4 pt-4 border-t border-gray-50 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="mb-4">
                              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Definition</h4>
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="text-gray-400 font-bold uppercase tracking-tighter">
                                    <th className="pb-2">Name</th>
                                    <th className="pb-2">Type</th>
                                    <th className="pb-2">Default</th>
                                  </tr>
                                </thead>
                                <tbody className="font-mono text-[11px]">
                                  {table.columns.map((col) => (
                                    <tr key={col.name} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                                      <td className="py-2 text-gray-900">{col.name} {col.nullable ? "" : "*"}</td>
                                      <td className="py-2 text-blue-600">{col.type}</td>
                                      <td className="py-2 text-gray-400">{col.default || "-"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            <div className="mt-6">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Data Browsing</h4>
                                <button
                                  onClick={(e) => { e.stopPropagation(); fetchTableRows(table.name); }}
                                  className="text-[10px] text-blue-600 hover:font-bold transition-all"
                                >
                                  Refresh Data
                                </button>
                              </div>
                              <div className="overflow-x-auto border border-gray-100 rounded-xl overflow-hidden">
                                {loadingTableData ? (
                                  <div className="flex items-center justify-center py-8 bg-gray-50/30">
                                    <Loader className="animate-spin w-4 h-4 text-blue-500" />
                                  </div>
                                ) : tableRows.length === 0 ? (
                                  <div className="py-8 text-center text-gray-400 text-[10px] bg-gray-50/30 font-medium">No data in this table</div>
                                ) : (
                                  <table className="w-full text-left text-[10px] min-w-max bg-white">
                                    <thead>
                                      <tr className="text-gray-400 font-bold uppercase tracking-tight border-b border-gray-100 bg-gray-50/50">
                                        {Object.keys(tableRows[0]).map(k => (
                                          <th key={k} className="px-3 py-2 border-r border-gray-100 last:border-0">{k}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="font-mono">
                                      {tableRows.map((row, i) => (
                                        <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-blue-50/30 transition-colors">
                                          {Object.values(row).map((v: any, j) => (
                                            <td key={j} className="px-3 py-2 border-r border-gray-50 last:border-0 text-gray-600 truncate max-w-[150px]">
                                              {v === null ? <span className="text-gray-300 italic">null</span> : String(v)}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "auth_providers" && (
              <div className="h-full bg-white">
                <AuthProviders projectId={projectId} onSendMessage={onSendMessage} />
              </div>
            )}

            {activeTab === "sql" && (
              <div className="flex h-full overflow-hidden">
                {/* SQL Files Sidebar */}
                <div className="w-[240px] border-r border-gray-100 flex flex-col bg-white">
                  <div className="p-4 border-b border-gray-50">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Migration History</h4>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {sqlFiles.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 text-xs">No migrations pushed yet</div>
                    ) : (
                      sqlFiles.map(file => (
                        <button
                          key={file.id}
                          onClick={() => setSelectedSqlFile(file)}
                          className={cn(
                            "w-full text-left px-4 py-3 border-b border-gray-50 transition-colors",
                            selectedSqlFile?.id === file.id ? "bg-blue-50/50" : "hover:bg-gray-50/50"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <FileCode className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-xs font-bold text-gray-900 truncate">{file.fileName}</span>
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {new Date(file.createdAt).toLocaleString()}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* SQL Content Viewer */}
                <div className="flex-1 flex flex-col bg-gray-50/30 overflow-hidden">
                  {selectedSqlFile ? (
                    <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-2 duration-300">
                      <div className="px-6 py-3 border-b border-gray-100 bg-white flex items-center justify-between">
                        <span className="text-xs font-mono text-gray-500">{selectedSqlFile.fileName}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-gray-100 rounded-full text-gray-500 uppercase font-bold tracking-tight">Read-only</span>
                      </div>
                      <div className="flex-1 p-6 overflow-auto">
                        <pre className="p-4 bg-gray-900 text-gray-100 rounded-2xl text-[11px] font-mono overflow-x-auto shadow-inner whitespace-pre-wrap leading-relaxed">
                          {selectedSqlFile.content}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                      <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 flex items-center justify-center mb-4 shadow-sm">
                        <Terminal className="w-8 h-8 text-gray-200" />
                      </div>
                      <h4 className="text-sm font-bold text-gray-900">Select a migration</h4>
                      <p className="text-xs text-gray-400 mt-1 max-w-[240px]">View the SQL code transmitted to your database in previous pushes.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "users" && (
              <div className="flex h-full overflow-hidden">
                {/* Left side: Scrollable user list */}
                <div className={cn("flex flex-col border-r border-gray-100 transition-all duration-200", selectedUser ? "w-1/2" : "w-full")}>
                  <div className="p-6">
                    {/* Signup Analytics Chart */}
                    <div className="mb-6">
                      <SignupChart projectId={projectId} />
                    </div>

                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-md text-gray-900">User Management</h3>
                        <p className="text-[12px] text-gray-500">Manage authenticated users and permissions.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          onClick={() => setShowAddUserModal(true)}
                          className="bg-white hover:bg-white hover:border-blue-200 text-gray-900  border rounded-md gap-2 shadow-none h-7"
                        >
                          <Plus className="w-4 h-4" />
                          Add User
                        </Button>
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search..."
                            className="pl-9 pr-4 py-1.5 bg-white h-7 border rounded-md text-xs focus:bg-white focus:border-blue-200 outline-none transition-all w-32 md:w-48"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-white border-b border-gray-100 text-gray-900 text-[14px]">
                              <th className="px-4 py-3 font-normal">User</th>
                              {!selectedUser && <th className="px-4 py-3 font-normal">ID</th>}
                              <th className="px-4 py-3 font-normal">Created</th>
                              <th className="px-4 py-3 text-right font-normal">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredUsers.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="px-4 py-20 text-center text-gray-400">
                                  <Users className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                  No users found
                                </td>
                              </tr>
                            ) : (
                              filteredUsers.map((user) => (
                                <tr
                                  key={user.id}
                                  className={cn(
                                    "border-b border-gray-50 last:border-0 hover:bg-gray-50/30 cursor-pointer",
                                    selectedUser?.id === user.id ? "bg-blue-50/50 hover:bg-blue-50/50" : ""
                                  )}
                                  onClick={() => setSelectedUser(user)}
                                >
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-3 group/user">
                                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                                        {(user.email || user.name || "?")[0].toUpperCase()}
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="font-bold text-gray-900 truncate max-w-[120px]">{user.email || "No Email"}</span>
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[10px] text-gray-400">{user.role}</span>

                                          {user.confirmed && <span className="w-1 h-1 rounded-full bg-emerald-500" title="Email Confirmed" />}
                                          {user.banned && <span className="text-[9px] BackgroundStyleButton rounded-sm text-black font-bold px-2 py-0.5">BANNED</span>}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  {!selectedUser && <td className="px-4 py-3 font-mono text-gray-400 text-[10px] truncate max-w-[100px]">{user.id}</td>}
                                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                    <div>{new Date(user.createdAt).toLocaleDateString()}</div>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => { e.stopPropagation(); handleDeleteUser(user.id); }}
                                        className="h-8 w-8 p-0 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                                        title="Delete user"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side: Detailed user view */}
                {selectedUser && (
                  <div className="w-1/2 flex flex-col bg-white overflow-y-auto">
                    <div className="p-6 space-y-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-900">User Details</h3>
                        <button onClick={() => setSelectedUser(null)} className="p-1 hover:bg-gray-200 rounded-lg transition-colors">
                          <X className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold">
                          {(selectedUser.email || selectedUser.name || "?")[0].toUpperCase()}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <h4 className="font-bold text-gray-900 text-lg truncate">{selectedUser.email || "No Email"}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded">{selectedUser.id}</code>
                            <button onClick={() => copyToClipboard(selectedUser.id, 'id')} className="text-gray-400 hover:text-blue-600">
                              {copiedField === 'id' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="">
                        {[
                          { label: "Role", value: selectedUser.role },
                          { label: "Provider", value: selectedUser.provider || "email" },
                          { label: "Confirmed", value: selectedUser.confirmed ? "Yes" : "No", color: selectedUser.confirmed ? "text-gray-900" : "text-gray-900" },
                          { label: "Banned", value: selectedUser.banned ? "Yes" : "No", color: selectedUser.banned ? "text-gray-900" : "text-gray-900" },
                          { label: "Created At", value: new Date(selectedUser.createdAt).toLocaleDateString() },
                          { label: "Last Sign In", value: selectedUser.lastSignIn ? new Date(selectedUser.lastSignIn).toLocaleDateString() : "Never" },
                        ].map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between px-1 py-2 bg-white border-b border-gray-10"
                          >
                            <span className="text-[12px] text-gray-900">
                              {item.label}
                            </span>
                            <span
                              className={cn(
                                "text-xs font-semibold",
                                item.color || "text-gray-700"
                              )}
                            >
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Login Methods Section */}
                      <div className="mt-6 pt-6 border-t border-gray-100">
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">
                          Login Methods
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: "email", label: "Email/Password", active: selectedUser?.provider?.includes("email") || selectedUser?.provider === "email" },
                            { id: "phone", label: "Phone", active: selectedUser?.provider?.includes("phone") },
                            { id: "google", label: "Google", active: selectedUser?.provider?.includes("google") },
                            { id: "apple", label: "Apple", active: selectedUser?.provider?.includes("apple") },
                          ].map(method => (
                            <div
                              key={method.id}
                              className={`p-3 rounded-lg border ${method.active
                                ? "border-green-200 bg-green-50"
                                : "border-gray-200 bg-gray-50"
                                }`}
                            >
                              <div className="text-xs font-medium">{method.label}</div>
                              <div className={`text-[10px] mt-1 ${method.active ? "text-green-600" : "text-gray-400"
                                }`}>
                                {method.active ? "Active" : "Inactive"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
                        <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Administrative Actions</h5>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handleBanUser(selectedUser.id, !!selectedUser.banned)}
                            className={cn("gap-2 h-9 text-xs rounded-xl flex-1", selectedUser.banned ? "hover:bg-white text-gray-900 border border-[#0099ff] bg-white h-8 rounded-md" : "hover:border-blue-200 hover:bg-white text-gray-900 border bg-white h-8 rounded-md")}
                          >
                            {selectedUser.banned ? <CheckCircle className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                            {selectedUser.banned ? "Unban User" : "Ban User"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleResetPassword(selectedUser.email)}
                            className="gap-2 h-9 text-xs flex-1 text-gray-900 hover:bg-white border bg-white h-8 rounded-md hover:border-blue-200"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Reset
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleDeleteUser(selectedUser.id)}
                            className="gap-2 h-9 text-xs w-full text-gray-900 hover:bg-white border bg-white h-8 rounded-md hover:border-blue-200"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Permanently Delete User
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "credentials" && (
              <div className="p-6 space-y-6">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-900">Secure Database Link</h4>
                      <p className="text-xs text-emerald-700">Project: {connection?.projectName || "Automated Falbor Database"}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {connectionStatus?.type === 'neon' ? (
                    <div className="p-4 border border-gray-100 rounded-2xl bg-white shadow-sm transition-all hover:bg-gray-50 group">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Neon Connection String</span>
                        <button
                          onClick={() => copyToClipboard(connection?.neonUrl, 'neon')}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-600 transition-all"
                        >
                          {copiedField === 'neon' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <div className="font-mono text-xs text-gray-600 truncate">
                        {connection?.neonUrl}
                      </div>
                    </div>
                  ) : (
                    [
                      { label: "Project URL", value: connection?.supabaseUrl, key: "url" },
                      { label: "Anon Public Key", value: connection?.anonKey, key: "anon" },
                      { label: "Service Role (Admin)", value: connection?.serviceRoleKey, key: "service" },
                    ].map((cred) => (
                      <div key={cred.key} className="p-4 border border-gray-100 rounded-2xl bg-white shadow-sm transition-all hover:bg-gray-50 group">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{cred.label}</span>
                          <button
                            onClick={() => copyToClipboard(cred.value, cred.key)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-600 transition-all"
                          >
                            {copiedField === cred.key ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <div className="font-mono text-xs text-gray-600 truncate">
                          {cred.value || "Not available"}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-start gap-3">
                    <Info className="w-4 h-4 text-gray-400 mt-0.5" />
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      These credentials are automatically injected into your project environment. Use the **Service Role** key only in server-side logic for administrative control.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* {activeTab === "auth_providers" && (
              <div className="p-6 space-y-6 overflow-y-auto h-full">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-md font-bold text-gray-900">Authentication Providers</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Manage how your users can sign in to your application</p>
                  </div>
                </div>

                {connectionStatus?.type === 'neon' ? (
                  <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-blue-500 text-white">
                        <Lock className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-blue-900">Manual Authentication (Neon)</h4>
                        <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                          Since you are using a managed Neon database, authentication is handled manually in your application code.
                          You should implement a `users` table and use libraries like `bcryptjs` and `iron-session` or `jsonwebtoken` for secure sessions.
                        </p>
                        <div className="mt-4 flex gap-3">
                          <Badge className="bg-blue-100 text-blue-700 border-none">Custom Users Table</Badge>
                          <Badge className="bg-blue-100 text-blue-700 border-none">Manual Token Management</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { id: 'email', name: 'Email / Password', status: 'Enabled', icon: Mail },
                      { id: 'phone', name: 'Phone Number', status: 'Disabled', icon: Cpu },
                      { id: 'google', name: 'Google', status: 'Disabled', icon: Globe },
                      { id: 'github', name: 'GitHub', status: 'Disabled', icon: Github },
                      { id: 'discord', name: 'Discord', status: 'Disabled', icon: MessageSquare },
                    ].map((provider) => (
                      <div key={provider.id} className="p-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-between group hover:border-blue-200 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 rounded-xl bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                            <provider.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900">{provider.name}</div>
                            <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{provider.id}</div>
                          </div>
                        </div>
                        <Badge className={cn(
                          "text-[10px] font-bold px-2 py-0.5",
                          provider.status === 'Enabled' ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"
                        )}>
                          {provider.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 mt-6">
                  <div className="flex items-start gap-3">
                    <Shield className="w-4 h-4 text-emerald-500 mt-0.5" />
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      Provider configuration is managed through the <span className="font-bold text-gray-900">Database &gt; Authentication</span> settings in your console.
                      Enable social providers there and they will automatically work with your Supabase Client.
                    </p>
                  </div>
                </div>
              </div>
            )} */}

            {activeTab === "sql" && (
              <div className="flex flex-col h-full bg-white">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-md font-bold text-gray-900">SQL History & Migrations</h3>
                      <p className="text-xs text-gray-500 mt-0.5">View and manage your database schema changes</p>
                    </div>
                    <Button variant="outline" className="h-8 text-xs gap-2 rounded-lg bg-white">
                      <Terminal className="w-3.5 h-3.5" />
                      Open SQL Editor
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  <div className="space-y-6">
                    {sqlFiles.length > 0 ? (
                      <div>
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Latest Migrations</h4>
                        <div className="space-y-2">
                          {sqlFiles.map((migration) => (
                            <div key={migration.id} className="p-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-between hover:border-blue-100 transition-all group">
                              <div className="flex items-center gap-4">
                                <div className="p-2.5 rounded-xl bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                  <FileCode className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{migration.fileName}</div>
                                  <div className="text-[10px] text-gray-400">
                                    {new Date(migration.createdAt).toLocaleString()} • {migration.source === 'neon' ? 'Neon' : 'Supabase'}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className="bg-green-50 text-green-700 border-green-200 text-[10px] font-bold uppercase">Applied</Badge>
                                <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-blue-400 transition-all" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-50 rounded-3xl">
                        <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                          <Terminal className="w-6 h-6 text-gray-300" />
                        </div>
                        <h4 className="text-sm font-bold text-gray-900">No Recent Queries</h4>
                        <p className="text-xs text-gray-500 mt-1 max-w-[240px] text-center px-4">
                          Queries executed via the chat will appear in your history here.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "emails" && (
              <div className="flex flex-col h-full overflow-hidden bg-white">
                {!selectedEmailTemplate ? (
                  /* List View */
                  <div className="p-6 overflow-y-auto">
                    <div className="mb-6 flex items-center justify-between">
                      <div>
                        <h3 className="text-md font-bold text-gray-900">Email Templates</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Customize authentication email notifications</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      {[
                        { id: "confirmation", label: "Confirm Sign Up", desc: "Ask users to confirm their email address after signing up" },
                        { id: "invite", label: "Invite User", desc: "Invite users who don't yet have an account to sign up" },
                        { id: "magic_link", label: "Magic Link", desc: "Allow users to sign in via a one-time link sent to their email" },
                        { id: "email_change", label: "Change Email", desc: "Ask users to verify their new email address after changing it" },
                        { id: "recovery", label: "Reset Password", desc: "Allow users to reset their password if they forget it" },
                        { id: "reauthentication", label: "Reauthentication", desc: "Ask users to re-authenticate before performing a sensitive action" },
                      ].map(t => (
                        <button
                          key={t.id}
                          onClick={() => setSelectedEmailTemplate(t.id)}
                          className="p-4 rounded-xl border border-gray-100 bg-white cursor-pointer hover:border-blue-200 hover:bg-blue-50/30 transition-all text-left flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-2.5 rounded-lg bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                              <Mail className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-900 mb-0.5">{t.label}</div>
                              <div className="text-xs text-gray-500 leading-relaxed max-w-sm">{t.desc}</div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                        </button>
                      ))}

                      <div className="mt-8 pt-6 border-t border-gray-100">
                        <div className="bg-blue-50/50 rounded-2xl p-6">
                          <div className="flex items-start gap-3 mb-4">
                            <Info className="w-5 h-5 text-gray-900 mt-0.5" />
                            <div>
                              <h4 className="text-sm font-bold text-gray-900">Reset System Templates</h4>
                              <p className="text-xs text-gray-900 mt-1">
                                You can also <button onClick={handleResetTemplates} className="cursor-pointer text-blue-600 font-bold hover:underline">reset all templates to their defaults</button>.
                                This will insert default headers and messages into all the templates.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Editor View */
                  <div className="flex flex-col h-full bg-white">
                    <div className="flex items-center justify-between bg-white sticky top-0 z-20 px-6 py-4 border-b border-gray-100">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setSelectedEmailTemplate(null)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-900 group"
                        >
                          <ChevronRight className="w-5 h-5 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
                        </button>
                        <div>
                          <h3 className="text-md font-bold text-gray-900">
                            {(() => {
                              const t = [
                                { id: "confirmation", label: "Confirm Sign Up" },
                                { id: "invite", label: "Invite User" },
                                { id: "magic_link", label: "Magic Link" },
                                { id: "email_change", label: "Change Email" },
                                { id: "recovery", label: "Reset Password" },
                                { id: "reauthentication", label: "Reauthentication" },
                              ].find(x => x.id === selectedEmailTemplate);
                              return t?.label || "Email Template";
                            })()}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">Template Editor</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex bg-gray-100 p-0.5 rounded-lg">
                          <button
                            onClick={() => setViewMode("code")}
                            className={cn(
                              "px-3 py-1 text-xs font-bold rounded-md transition-all",
                              viewMode === "code" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                            )}
                          >
                            Code
                          </button>
                          <button
                            onClick={() => setViewMode("preview")}
                            className={cn(
                              "px-3 py-1 text-xs font-bold rounded-md transition-all",
                              viewMode === "preview" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                            )}
                          >
                            Display
                          </button>
                        </div>
                        <Button
                          onClick={handleSaveAuthConfig}
                          disabled={loading}
                          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-8 px-4 gap-2 text-xs font-bold shadow-sm"
                        >
                          {loading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          Save Changes
                        </Button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                      {authConfig && authConfigError === null ? (
                        <div className="p-6 space-y-6 max-w-5xl mx-auto">
                          {/* Subject Line */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between px-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Subject Line</label>
                              <span className="text-[10px] text-blue-500 font-bold">Synchronized with Supabase</span>
                            </div>
                            <input
                              type="text"
                              value={authConfig[`mailer_templates_${selectedEmailTemplate}_subject`] || ""}
                              onChange={(e) => setAuthConfig({ ...authConfig, [`mailer_templates_${selectedEmailTemplate}_subject`]: e.target.value })}
                              className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm focus:border-blue-200 outline-none transition-all shadow-sm font-medium text-gray-900 hover:border-gray-200"
                              placeholder="Enter email subject..."
                            />
                          </div>

                          {/* Editor Section */}
                          {viewMode === "code" ? (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between px-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">HTML Content</label>
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-tighter ring-1 ring-blue-100">Editor Pane Mode</span>
                                </div>
                              </div>
                              <div className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm bg-white h-[600px] relative">
                                <Editor
                                  height="100%"
                                  language="html"
                                  value={authConfig[`mailer_templates_${selectedEmailTemplate}_content`] || ""}
                                  onChange={(value) => setAuthConfig({ ...authConfig, [`mailer_templates_${selectedEmailTemplate}_content`]: value || "" })}
                                  options={{
                                    minimap: { enabled: false },
                                    fontSize: 13,
                                    fontFamily: "'Fira Code', 'Menlo', 'Monaco', 'Courier New', monospace",
                                    lineNumbers: "on",
                                    roundedSelection: true,
                                    scrollBeyondLastLine: false,
                                    readOnly: false,
                                    theme: "vs",
                                    padding: { top: 20 },
                                    automaticLayout: true,
                                  }}
                                />
                              </div>

                              {/* Variable Buttons */}
                              <div className="space-y-3">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Available Variables</h4>
                                <div className="flex flex-wrap gap-2">
                                  {[
                                    ".ConfirmationURL",
                                    ".Token",
                                    ".TokenHash",
                                    ".SiteURL",
                                    ".Email",
                                    ".Data",
                                    ".RedirectTo"
                                  ].map((variable) => (
                                    <button
                                      key={variable}
                                      onClick={() => {
                                        const currentContent = authConfig[`mailer_templates_${selectedEmailTemplate}_content`] || ""
                                        setAuthConfig({
                                          ...authConfig,
                                          [`mailer_templates_${selectedEmailTemplate}_content`]: currentContent + ` {{ ${variable} }}`
                                        })
                                      }}
                                      className="px-3 py-1.5 bg-gray-50 hover:bg-white hover:border-blue-200 border border-gray-100 rounded-lg text-[11px] font-mono text-gray-600 transition-all shadow-sm active:scale-95"
                                    >
                                      {"{{ " + variable + " }}"}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2 h-[750px] flex flex-col">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Live Display Preview</label>
                              <div className="flex-1 rounded-2xl border border-gray-100 overflow-hidden shadow-sm bg-white">
                                <iframe
                                  title="Email Preview"
                                  srcDoc={authConfig[`mailer_templates_${selectedEmailTemplate}_content`] || ""}
                                  className="w-full h-full border-none bg-white"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ) : authConfigError ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                            <AlertTriangle className="w-8 h-8 text-red-400" />
                          </div>
                          <h4 className="text-sm font-bold text-gray-900 mb-2">Failed to Load Template</h4>
                          <p className="text-xs text-gray-500 max-w-[280px] mb-4">{authConfigError}</p>
                          <Button onClick={fetchAuthConfig} variant="outline" className="gap-2 h-9 text-xs rounded-xl">
                            <RefreshCw className="w-4 h-4" />
                            Retry Connection
                          </Button>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                          <div className="w-10 h-10 rounded-full border-2 border-blue-100 border-t-blue-500 animate-spin mb-4" />
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Syncing with server...</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "storage" && (
              <div className="flex h-full overflow-hidden">
                {/* Left: Buckets or Files List */}
                <div className="w-1/2 border-r border-gray-100 flex flex-col">
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-md font-bold text-gray-900">
                          {selectedBucket ? selectedBucket : "Storage Buckets"}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {selectedBucket ? "Files in this bucket" : "Manage file storage"}
                        </p>
                      </div>
                      {selectedBucket && (
                        <Button
                          onClick={() => setSelectedBucket(null)}
                          variant="outline"
                          className="h-8 text-xs border bg-white hover:bg-white text-black hover:border-blue-200"
                        >
                          ← Back to Buckets
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3">
                    {!selectedBucket ? (
                      // Show buckets list
                      storage.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                            <HardDrive className="w-8 h-8 text-blue-400" />
                          </div>
                          <h4 className="text-sm font-bold text-gray-900">No Storage Buckets</h4>
                          <p className="text-xs text-gray-500 mt-1 max-w-[280px]">
                            Create a bucket in your Supabase dashboard to get started.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {storage.map((bucket: any) => (
                            <button
                              key={bucket.id}
                              onClick={() => setSelectedBucket(bucket.name)}
                              className="w-full p-4 bg-white border border-gray-100 rounded-md cursor-pointer hover:border-blue-200 hover:bg-blue-50/30 transition-all text-left group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100">
                                  <HardDrive className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-bold text-gray-900">{bucket.name}</h4>
                                  <p className="text-xs text-gray-500">
                                    {bucket.public ? "Public" : "Private"} bucket
                                  </p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                              </div>
                            </button>
                          ))}
                        </div>
                      )
                    ) : (
                      // Show files in selected bucket
                      loadingFiles ? (
                        <div className="flex items-center justify-center h-full">
                          <Loader className="w-6 h-6 animate-spin text-blue-500" />
                        </div>
                      ) : bucketFiles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                            <FileCode className="w-8 h-8 text-gray-400" />
                          </div>
                          <h4 className="text-sm font-bold text-gray-900">No Files</h4>
                          <p className="text-xs text-gray-500 mt-1 max-w-[280px]">
                            This bucket is empty. Upload files through your application.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {bucketFiles.map((file: any) => (
                            <button
                              key={file.id}
                              onClick={() => setSelectedFile(file)}
                              className={cn(
                                "w-full p-3 bg-white border rounded-md cursor-pointer hover:border-blue-200 transition-all text-left",
                                selectedFile?.id === file.id ? "border-blue-500 bg-blue-50" : "border-gray-100"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <FileCode className="w-4 h-4 text-gray-400" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm text-gray-900 truncate">{file.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(file.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Right: File Preview */}
                <div className="w-1/2 flex flex-col bg-white">
                  {selectedFile ? (
                    <div className="p-6">
                      <h4 className="font-bold text-gray-900 mb-4">File Details</h4>
                      <div className="bg-white rounded-md border p-4 space-y-3">
                        <div>
                          <span className="text-xs text-gray-500">Name</span>
                          <p className="font-medium text-sm">{selectedFile.name}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Bucket</span>
                          <p className="font-medium text-sm">{selectedFile.bucket_id}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Created</span>
                          <p className="font-medium text-sm">
                            {new Date(selectedFile.created_at).toLocaleString()}
                          </p>
                        </div>
                        {selectedFile.metadata && (
                          <div>
                            <span className="text-xs text-gray-500">Size</span>
                            <p className="font-medium text-sm">
                              {(selectedFile.metadata.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        )}
                      </div>

                      {/* File Actions */}
                      <div className="mt-6 space-y-2">
                        <h5 className="text-xs font-bold text-gray-400 uppercase mb-3">Actions</h5>
                        <Button
                          onClick={() => {
                            const url = `${connection?.supabaseUrl}/storage/v1/object/public/${selectedFile.bucket_id}/${selectedFile.name}`
                            window.open(url, '_blank')
                          }}
                          className="gap-2 w-full h-9 text-xs flex-1 text-gray-900 hover:bg-white border bg-white h-8 rounded-md hover:border-blue-200"
                        >
                          <HardDrive className="w-4 h-4" />
                          Download File
                        </Button>
                        <Button
                          onClick={() => {
                            const newName = prompt('Enter new file name:', selectedFile.name)
                            if (newName && newName !== selectedFile.name) {
                              alert('Rename functionality requires Supabase Storage API integration')
                            }
                          }}
                          variant="outline"
                          className="gap-2 w-full h-9 text-xs flex-1 text-gray-900 hover:bg-white border bg-white h-8 rounded-md hover:border-blue-200"
                        >
                          <FileCode className="w-4 h-4" />
                          Rename File
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-center p-12">
                      <div>
                        <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 flex items-center justify-center mb-4 mx-auto">
                          <FileCode className="w-8 h-8 text-gray-200" />
                        </div>
                        <h4 className="text-sm font-bold text-gray-900">Select a file</h4>
                        <p className="text-xs text-gray-500 mt-1 max-w-[240px]">
                          Click on a file to view its details
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "functions" && (
              <div className="flex h-full overflow-hidden">
                {/* Functions Table */}
                <div className={cn("flex flex-col border-r border-gray-100 transition-all", selectedFunction ? "w-1/2" : "w-full")}>
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-md font-bold text-gray-900">Edge Functions</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Serverless functions deployed on Supabase</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3">
                    {functions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                          <Cpu className="w-8 h-8 text-indigo-400" />
                        </div>
                        <h4 className="text-sm font-bold text-gray-900">No Edge Functions</h4>
                        <p className="text-xs text-gray-500 mt-1 max-w-[280px]">
                          Deploy Edge Functions through the Supabase CLI or dashboard.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white border border-gray-100 rounded-md overflow-hidden">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-white border-b border-gray-100 text-gray-400 font-bold">
                              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">Name</th>
                              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">Version</th>
                              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">Status</th>
                              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">Created</th>
                              <th className="px-4 py-3"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {functions.map((fn: any) => (
                              <tr
                                key={fn.id}
                                className={cn(
                                  "border-b border-gray-50 last:border-0 hover:bg-blue-50/30 cursor-pointer transition-all",
                                  selectedFunction?.id === fn.id ? "bg-blue-50" : ""
                                )}
                                onClick={() => setSelectedFunction(fn)}
                              >
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                                      <Cpu className="w-4 h-4" />
                                    </div>
                                    <span className="font-bold text-sm text-gray-900">{fn.name}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">{fn.version || "1"}</td>
                                <td className="px-4 py-3">
                                  <Badge className={cn(
                                    "text-xs",
                                    fn.status === "ACTIVE" ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-700"
                                  )}>
                                    {fn.status || "Active"}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">
                                  {new Date(fn.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3">
                                  <ChevronRight className="w-4 h-4 text-gray-400" />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Function Details Panel */}
                {selectedFunction && (
                  <div className="w-1/2 flex flex-col bg-white">
                    <div className="p-6 border-b border-gray-100">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-900">Function Details</h3>
                        <button onClick={() => setSelectedFunction(null)} className="p-1 hover:bg-gray-200 rounded-lg transition-colors">
                          <X className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>

                      {/* Detail Tabs */}
                      <div className="flex gap-2 border-b border-gray-100 -mb-px">
                        {["overview", "invocations", "logs", "details", "code"].map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setFunctionDetailTab(tab)}
                            className={cn(
                              "px-4 py-2 text-sm font-medium capitalize transition-all border-b-2",
                              functionDetailTab === tab
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-900"
                            )}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                      {functionDetailTab === "overview" && (
                        <div className="space-y-4">
                          <div className="bg-white border border-gray-100 rounded-xl p-4">
                            <h4 className="text-sm font-bold text-gray-900 mb-3">Function Information</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-xs text-gray-500">Name</span>
                                <span className="text-sm font-medium">{selectedFunction.name}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs text-gray-500">Version</span>
                                <span className="text-sm font-medium">{selectedFunction.version || "1"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs text-gray-500">Status</span>
                                <Badge className="text-xs">{selectedFunction.status || "Active"}</Badge>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs text-gray-500">Created</span>
                                <span className="text-sm font-medium">{new Date(selectedFunction.createdAt).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {functionDetailTab === "invocations" && (
                        <div className="text-center py-12">
                          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                            <Terminal className="w-6 h-6 text-gray-400" />
                          </div>
                          <p className="text-sm text-gray-500">Invocation metrics coming soon</p>
                        </div>
                      )}

                      {functionDetailTab === "logs" && (
                        <div className="text-center py-12">
                          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                            <FileCode className="w-6 h-6 text-gray-400" />
                          </div>
                          <p className="text-sm text-gray-500">Function logs coming soon</p>
                        </div>
                      )}

                      {functionDetailTab === "details" && (
                        <div className="bg-white border border-gray-100 rounded-xl p-4">
                          <h4 className="text-sm font-bold text-gray-900 mb-3">All Details</h4>
                          <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-auto">
                            {JSON.stringify(selectedFunction, null, 2)}
                          </pre>
                        </div>
                      )}

                      {functionDetailTab === "code" && (
                        <div className="bg-white border border-gray-100 rounded-xl p-4">
                          <h4 className="text-sm font-bold text-gray-900 mb-3">Function Code</h4>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "feedback" && (
              <div className="flex h-full overflow-hidden bg-white">
                {/* Feedback List */}
                <div className={cn("flex flex-col transition-all duration-200", selectedFeedback ? "w-1/2" : "w-full")}>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-md font-bold text-gray-900">User Feedback</h3>
                        <p className="text-[12px] text-gray-500">View and respond to feedback submitted by your users.</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="relative">
                          <Key className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="password"
                            value={resendKey}
                            onChange={(e) => setResendKey(e.target.value)}
                            placeholder="Resend API Key"
                            title="Enter your Resend API Key to automatically send reply emails"
                            className="pl-9 pr-4 py-1.5 bg-white h-7 border rounded-md text-xs focus:bg-white focus:border-blue-200 outline-none transition-all w-48"
                          />
                        </div>
                        <Button
                          onClick={fetchFeedback}
                          variant="outline"
                          className="h-7 text-xs gap-2 hover:bg-white text-black shadow-none border bg-white rounded-md"
                        >
                          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                          Refresh
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {feedback.length === 0 ? (
                        <div className="py-20 text-center border border-gray-100 rounded-2xl bg-gray-50/20">
                          <Mail className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                          <h4 className="text-sm font-bold text-gray-900">No feedback yet</h4>
                          <p className="text-xs text-gray-500 mt-1">Once users submit feedback via your website, it will appear here.</p>
                        </div>
                      ) : (
                        <div className="bg-white border border-gray-100 rounded-md overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="border-b border-gray-100">
                                <tr className="text-gray-400 font-bold uppercase tracking-tighter">
                                  <th className="px-4 py-3">User</th>
                                  <th className="px-4 py-3">Message</th>
                                  <th className="px-4 py-3">Status</th>
                                  <th className="px-4 py-3">Date</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {feedback.map((item) => (
                                  <tr
                                    key={item.id}
                                    onClick={() => setSelectedFeedback(item)}
                                    className={cn(
                                      "hover:bg-gray-50/50 cursor-pointer transition-colors",
                                      selectedFeedback?.id === item.id ? "bg-blue-50/50" : ""
                                    )}
                                  >
                                    <td className="px-4 py-3">
                                      <div className="flex flex-col">
                                        <span className="font-bold text-gray-900 truncate max-w-[150px]">{item.email}</span>
                                        <span className="text-[10px] text-gray-400">{item.userId ? "Authenticated" : "Guest"}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <p className="text-gray-600 truncate max-w-[200px]">{item.message}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                      <Badge className={cn(
                                        "text-[11px]",
                                        item.status === "pending" ? "BackgroundStyleButton text-black" : "bg-[#0099ff]/20 text-[#0099ff]"
                                      )}>
                                        {item.status}
                                      </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                                      {new Date(item.createdAt).toLocaleDateString()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Feedback Detail View */}
                {selectedFeedback && (
                  <div className="w-1/2 flex flex-col bg-white overflow-y-auto animate-in fade-in slide-in-from-right-2 duration-300">
                    <div className="p-6 space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-gray-900">Feedback Details</h3>
                        <button onClick={() => setSelectedFeedback(null)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                          <X className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div className="BackgroundStyleButton rounded-md p-1 space-y-4">
                          <div className="flex items-center gap-3 px-2 py-2 border border-gray-300 rounded-sm">
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                              {selectedFeedback.email[0].toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900">{selectedFeedback.email}</h4>
                              <p className="text-[10px] text-gray-400">{new Date(selectedFeedback.createdAt).toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="bg-white rounded-sm p-2 mt-[-10px]">
                            <p className="text-sm text-gray-700 leading-relaxed italic">"{selectedFeedback.message}"</p>
                          </div>
                        </div>

                        {selectedFeedback.reply ? (
                          <div className="BackgroundStyleButton rounded-md p-1 space-y-3">
                            <div className="flex items-center gap-2 text-black px-2 py-2">
                              <CheckCircle className="w-4 h-4" />
                              <h4 className="text-sm">Your Response</h4>
                              <p className="text-[10px] text-gray-400 text-right">Replied on {new Date(selectedFeedback.repliedAt).toLocaleString()}</p>
                            </div>
                            <div className="bg-white rounded-sm p-2 mt-[-10px]">
                              <p className="text-sm text-gray-900 leading-relaxed">{selectedFeedback.reply}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Write a Response</h4>
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Type your reply here..."
                              rows={6}
                              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:bg-white focus:border-blue-200 outline-none transition-all resize-none shadow-inner"
                            />
                            <Button
                              onClick={handleSendReply}
                              disabled={sendingReply || !replyText}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 gap-2 font-bold shadow-md shadow-blue-200/50 transition-all active:scale-[0.98]"
                            >
                              {sendingReply ? <Loader className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                              Send Reply via Resend
                            </Button>
                            <p className="text-[10px] text-gray-400 text-center px-4">
                              Note: This will send an email to the user using your Resend API configuration.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "ai" && (
              <div className="p-8 max-w-4xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Falbor AI Settings</h3>
                    <p className="text-sm text-gray-500 mt-1">Configure your project's AI capabilities and API keys.</p>
                  </div>
                  <Sparkles className="w-8 h-8 text-blue-500 opacity-20" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* API Key Card */}
                  <div className="bg-white border rounded-sm p-6 shadow-xs">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <Key className="w-5 h-5" />
                      </div>
                      <h4 className="text-sm font-bold text-gray-900">Project API Key</h4>
                    </div>

                    <div className="space-y-4">
                      <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-2 group/key">
                        <code className="flex-1 text-xs font-mono text-gray-600 truncate">
                          {showApiKey ? aiUsage?.projectKey : "••••••••••••••••••••••••••••••••"}
                        </code>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-white rounded-lg transition-all"
                          >
                            {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(aiUsage?.projectKey, 'apikey')}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
                          >
                            {copiedField === 'apikey' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed px-1">
                        This key is used to authenticate requests to the Falbor AI API from your published website.
                      </p>
                    </div>
                  </div>

                  {/* Integration Card */}
                  <div className="bg-white border rounded-sm p-6 shadow-xs">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Terminal className="w-5 h-5" />
                      </div>
                      <h4 className="text-sm font-bold text-gray-900">Integration Code</h4>
                    </div>

                    <div className="space-y-3">
                      <pre className="p-3 bg-gray-900 text-gray-100 rounded-2xl text-[10px] font-mono overflow-auto h-24">
                        {`const res = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_KEY'
  },
  body: JSON.stringify({
    messages: [{ role: 'user', content: '...' }]
  })
})`}
                      </pre>
                      <button className="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-1 font-medium">
                        View Documentation <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-8">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-200">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-md font-bold text-emerald-900 mb-2">Automated Security</h4>
                      <p className="text-sm text-emerald-700 leading-relaxed max-w-2xl">
                        AI-generated sites are automatically protected by our proxy. The AI is instructed to hide sensitive API keys and only expose the Falbor AI client to your users.
                      </p>
                    </div>
                  </div>
                </div> */}

                {/* Test Chat Section */}
                <div className="bg-white border rounded-sm p-6 shadow-xs">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500 text-white flex items-center justify-center">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">Test AI API <Badge className="ml-2">Beta</Badge></h4>
                      <p className="text-[11px] text-gray-500">Type a message to instantly verify your API connection.</p>
                    </div>
                  </div>

                  <div className="space-y-4 border border-gray-50 rounded-2xl p-4 bg-gray-50/30">
                    <div id="test-chat-messages" className="h-[200px] overflow-y-auto space-y-3 pr-2 custom-scrollbar flex flex-col">
                      <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm max-w-[80%] self-start border border-gray-100">
                        <p className="text-xs text-gray-600">Connection ready. How can I help you today?</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Send a test message..."
                        id="test-chat-input"
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                            const input = e.target as HTMLInputElement;
                            const message = input.value.trim();
                            if (!message) return;
                            input.value = '';

                            const container = document.getElementById('test-chat-messages');
                            if (!container) return;

                            // Add user message
                            const uDiv = document.createElement('div');
                            uDiv.className = 'bg-blue-600 text-white p-3 rounded-2xl rounded-tr-none shadow-sm max-w-[80%] self-end border border-blue-500 ml-auto mt-3';
                            uDiv.innerHTML = `<p class="text-xs">${message}</p>`;
                            container.appendChild(uDiv);
                            container.scrollTop = container.scrollHeight;

                            // Add loading
                            const lDiv = document.createElement('div');
                            lDiv.className = 'bg-white p-3 rounded-2xl rounded-tl-none shadow-sm max-w-[80%] self-start border border-gray-100 mt-3 animate-pulse';
                            lDiv.innerHTML = `<p class="text-xs text-gray-400">Thinking...</p>`;
                            container.appendChild(lDiv);
                            container.scrollTop = container.scrollHeight;

                            try {
                              const res = await fetch('/api/ai/chat', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'x-falbor-key': aiUsage?.projectKey || ''
                                },
                                body: JSON.stringify({
                                  messages: [{ role: 'user', content: message }]
                                })
                              });

                              const data = await res.json();
                              lDiv.classList.remove('animate-pulse');
                              if (data.content) {
                                lDiv.innerHTML = `<p class="text-xs text-gray-700">${data.content}</p>`;
                              } else {
                                lDiv.innerHTML = `<p class="text-xs text-red-500">Error: ${data.error || 'No content'}</p>`;
                              }
                            } catch (err) {
                              lDiv.innerHTML = `<p class="text-xs text-red-500">Failed to connect to API</p>`;
                            }
                            container.scrollTop = container.scrollHeight;
                          }
                        }}
                        className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "usage" && (
              <div className="p-8 max-w-4xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Resource Usage</h3>
                    <p className="text-sm text-gray-500 mt-1">Track your project's AI message consumption and limits.</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-blue-500 opacity-20" />
                </div>

                <div className="bg-white border rounded-sm p-8 shadow-xs">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="flex flex-col gap-2">
                      <div className="text-[11px] text-gray-400 font-bold uppercase tracking-widest pl-1">Available Balance</div>
                      <div className="text-3xl font-black text-gray-900">
                        ${aiUsage?.balance?.toFixed(2) || "0.00"}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="text-[11px] text-gray-400 font-bold uppercase tracking-widest pl-1">Total Messages</div>
                      <div className="text-3xl font-black text-zinc-400">
                        {aiUsage?.totalMessages || 0}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="text-[11px] text-gray-400 font-bold uppercase tracking-widest pl-1">Accumulated Cost</div>
                      <div className="text-3xl font-black text-zinc-400">
                        ${aiUsage?.totalCost?.toFixed(2) || "0.00"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 p-4 bg-zinc-50 border border-zinc-100 rounded-xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-zinc-200">
                      <Info size={14} className="text-zinc-400" />
                    </div>
                    <p className="text-xs text-zinc-500">
                      Your account is currently on the <span className="font-bold text-zinc-700 capitalize">{aiUsage?.tier}</span> plan.
                      API usage is billed per token and deducted from your Falbor Balance.
                    </p>
                  </div>
                </div>

                <div className="BackgroundStyleButton rounded-sm p-8 flex items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-2xl bg-gray-600 text-white shadow-lg shadow-blue-200">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-md font-bold text-gray-900 mb-1">Need more messages?</h4>
                      <p className="text-sm text-gray-700 opacity-80">Upgrade your plan to increase your monthly limit and unlock advanced models.</p>
                    </div>
                  </div>
                  <Link href="/pricing">
                    <Button variant="outline" className="bg-white hover:bg-blue-600 hover:text-white transition-all rounded-xl h-11 px-6 font-bold border-blue-200 text-blue-600">
                      Upgrade Now
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Details Modal - REMOVED for Split-View */}

          {/* Add User Modal */}
          {showAddUserModal && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">Create New User</h3>
                  <button onClick={() => setShowAddUserModal(false)} className="p-1 hover:bg-gray-200 rounded-lg transition-colors">
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Email Address</label>
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:bg-white focus:border-blue-200 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Password</label>
                    <input
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:bg-white focus:border-blue-200 outline-none transition-all"
                    />
                  </div>
                  <Button
                    onClick={handleCreateUser}
                    disabled={loading || !newUserEmail || newUserPassword.length < 6}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 mt-2 gap-2"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Create User
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}