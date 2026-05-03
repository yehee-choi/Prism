export type Role = 'stock' | 'fund' | 'financial' | 'analyst'

export interface RoleInfo {
  id: Role
  label: string
  desc: string
  color: string
  bg: string
}

export interface Warning {
  level: 'error' | 'warning' | 'info'
  msg: string
}
