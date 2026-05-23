import axiosInstance from './axiosInstance'

const CLAIM_BASE = 'http://localhost:8083'

export const createClaim = (foodPostId, ngoName) =>
  axiosInstance.post(`${CLAIM_BASE}/api/claims`, { foodPostId, ngoName })

export const getClaims = () =>
  axiosInstance.get(`${CLAIM_BASE}/api/claims`)

export const updateClaim = (id, status) =>
  axiosInstance.put(`${CLAIM_BASE}/api/claims/${id}`, { status })
