export interface Participant {
  id: string;
  label: string;
  short: string;
  color: string;
}

export type ArrowType = "call" | "return" | "subcall" | "subreturn" | "self";

export interface Arrow {
  from: number;
  to: number;
  label: string;
  type: ArrowType;
  detailId?: number;
}

export interface Step {
  id: number;
  title: string;
  subtitle: string;
  arrows: Arrow[];
}

export interface DetailParam {
  name: string;
  value: string;
  desc: string;
}

export interface DetailReturn {
  name: string;
  value: string;
  type: string;
}

export interface DetailStorageChange {
  slot: string;
  before: string;
  after: string;
}

export interface Detail {
  title: string;
  signature: string;
  params: DetailParam[];
  logic: string[];
  returns: DetailReturn[];
  events: string[];
  storage: DetailStorageChange[];
}

export interface StateEntry {
  k: string;
  v: string;
}

export type StateChanges = Record<string, StateEntry[]>;
