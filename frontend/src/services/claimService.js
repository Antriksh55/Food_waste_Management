import axiosInstance from './axiosInstance'

const CLAIM_BASE = 'http://localhost:8083'

export const createClaim = (foodPostId) =>
  axiosInstance.post(`${CLAIM_BASE}/api/claims`, { foodPostId })

export const getClaims = () =>
  axiosInstance.get(`${CLAIM_BASE}/api/claims`)

export const updateClaim = (id, status) =>
  axiosInstance.put(`${CLAIM_BASE}/api/claims/${id}`, { status })
