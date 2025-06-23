"use client"

import { useState, useEffect } from "react"

interface ConfigData {
  environments: any[]
  teams: any[]
  categories: any[]
  severities: any[]
  outageTypes: any[]
  timezones: any[]
}

interface UseConfigDataReturn {
  data: ConfigData
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useConfigData(): UseConfigDataReturn {
  const [data, setData] = useState<ConfigData>({
    environments: [],
    teams: [],
    categories: [],
    severities: [],
    outageTypes: [],
    timezones: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConfig = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/config?type=all")

      if (!response.ok) {
        throw new Error(`Failed to fetch configuration: ${response.status} ${response.statusText}`)
      }

      const configData = await response.json()

      setData({
        environments: configData.environments || [],
        teams: configData.teams || [],
        categories: configData.categories || [],
        severities: configData.severities || [],
        outageTypes: configData.outageTypes || [],
        timezones: configData.timezones || [],
      })

      console.log("Configuration data loaded successfully:", {
        environments: configData.environments?.length || 0,
        teams: configData.teams?.length || 0,
        categories: configData.categories?.length || 0,
        severities: configData.severities?.length || 0,
        outageTypes: configData.outageTypes?.length || 0,
        timezones: configData.timezones?.length || 0,
      })
    } catch (err) {
      console.error("Error fetching configuration data:", err)
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  return {
    data,
    loading,
    error,
    refetch: fetchConfig,
  }
}

// Individual hooks for specific data types
export function useEnvironments() {
  const { data, loading, error, refetch } = useConfigData()
  return {
    environments: data.environments,
    loading,
    error,
    refetch,
  }
}

export function useTeams() {
  const { data, loading, error, refetch } = useConfigData()
  return {
    teams: data.teams,
    loading,
    error,
    refetch,
  }
}

export function useCategories() {
  const { data, loading, error, refetch } = useConfigData()
  return {
    categories: data.categories,
    loading,
    error,
    refetch,
  }
}

export function useSeverities() {
  const { data, loading, error, refetch } = useConfigData()
  return {
    severities: data.severities,
    loading,
    error,
    refetch,
  }
}

export function useOutageTypes() {
  const { data, loading, error, refetch } = useConfigData()
  return {
    outageTypes: data.outageTypes,
    loading,
    error,
    refetch,
  }
}

export function useTimezones() {
  const { data, loading, error, refetch } = useConfigData()
  return {
    timezones: data.timezones,
    loading,
    error,
    refetch,
  }
}
