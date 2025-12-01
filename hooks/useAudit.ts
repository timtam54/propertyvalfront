'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { useGoogleAuth } from '@/components/AuthProvider'
import { API } from '@/lib/config'

interface AuditParams {
  page: string
  action: string
  propertyid?: number
}

interface AuditPayload {
  ipaddress: string
  id: number
  action: string
  page: string
  username: string
  dte: string
  propertyid: number
}

/**
 * Get the user's IP address
 * This uses a free IP lookup service
 */
async function getIPAddress(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json')
    const data = await response.json()
    return data.ip || 'unknown'
  } catch (error) {
    console.error('Failed to get IP address:', error)
    return 'unknown'
  }
}

/**
 * Hook to track user actions for audit purposes
 * Automatically logs page views and actions to the audit API
 */
export function useAudit() {
  const { accounts } = useMsal()
  const { googleUser } = useGoogleAuth()
  const ipAddressRef = useRef<string | null>(null)

  // Get user email from either Google or Microsoft auth
  const msalUser = accounts[0]
  const userEmail = googleUser?.email || msalUser?.username || 'anonymous'

  // Fetch IP address once when hook is initialized
  useEffect(() => {
    if (!ipAddressRef.current) {
      getIPAddress().then(ip => {
        ipAddressRef.current = ip
      })
    }
  }, [])

  const logAudit = useCallback(async ({ page, action, propertyid }: AuditParams) => {
    try {
      // Get IP address (use cached if available)
      const ipaddress = ipAddressRef.current || await getIPAddress()

      // Cache IP for future calls
      if (!ipAddressRef.current) {
        ipAddressRef.current = ipaddress
      }

      const payload: AuditPayload = {
        ipaddress,
        id: 0,
        action,
        page,
        username: userEmail,
        dte: new Date().toISOString(),
        propertyid: propertyid || 0
      }

      const response = await fetch(`${API}/audit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        console.error('Audit log failed:', response.status, response.statusText)
      }
    } catch (error) {
      // Don't throw errors from audit logging - fail silently
      console.error('Error logging audit:', error)
    }
  }, [userEmail])

  return { logAudit }
}

/**
 * Hook to automatically log page views
 * Call this at the top of any page component to track visits
 */
export function usePageView(page: string, propertyid?: number) {
  const { accounts } = useMsal()
  const isMsalAuthenticated = useIsAuthenticated()
  const { googleUser, isGoogleAuthenticated } = useGoogleAuth()
  const { logAudit } = useAudit()
  const hasLoggedRef = useRef(false)

  // Check if auth state is still loading
  const isAuthenticated = isMsalAuthenticated || isGoogleAuthenticated
  const msalUser = accounts[0]
  const userEmail = googleUser?.email || msalUser?.username

  useEffect(() => {
    // Wait for auth to be determined and ensure we have a user email before logging
    // This ensures we capture the actual user email instead of 'anonymous'
    if (!hasLoggedRef.current && (isAuthenticated || userEmail)) {
      logAudit({ page, action: 'view', propertyid })
      hasLoggedRef.current = true
    }
  }, [page, propertyid, logAudit, isAuthenticated, userEmail])

  return { logAudit }
}
