import { z } from 'zod';
const sourceState = z.enum(['live','stale','unavailable','error','demo','partial']);
const assessmentStatus = z.enum(['low','moderate','high','very_high','insufficient_data','degraded','unavailable']);
export const catchment = z.object({id:z.string(),name:z.string(),region:z.string().nullable(),geometry:z.record(z.unknown()).nullable(),geometry_source:z.string().nullable(),validation_status:z.string(),is_demo:z.boolean()});
export const catchmentsResponse = z.object({items:z.array(catchment),count:z.number(),is_demo:z.boolean()});
export const observation = z.object({source_id:z.string(),provider:z.string(),variable:z.string(),value:z.union([z.number(),z.string()]).nullable(),unit:z.string().nullable(),observed_at:z.string().nullable(),issued_at:z.string().nullable(),fetched_at:z.string(),valid_from:z.string().nullable(),valid_to:z.string().nullable(),geographic_coverage:z.record(z.unknown()),freshness:z.string(),source_state:sourceState,quality_flags:z.array(z.string()),is_demo:z.boolean()});
export const observationsResponse = z.object({catchment_id:z.string(),items:z.array(observation),source_state:sourceState,is_demo:z.boolean()});
export const warningItem = z.object({source_id:z.string(),provider:z.string(),title:z.string(),severity:z.string().nullable(),description:z.string().nullable(),issued_at:z.string().nullable(),valid_from:z.string().nullable(),valid_to:z.string().nullable(),geography:z.record(z.unknown()),source_state:sourceState,is_demo:z.boolean()});
export const warningsResponse = z.object({catchment_id:z.string(),items:z.array(warningItem),source_state:sourceState,is_demo:z.boolean(),message:z.string()});
export const sourceStatus = z.object({provider:z.string(),capability:z.string(),state:sourceState,observation_or_issue_time:z.string().nullable(),fetched_at:z.string().nullable(),units:z.array(z.string()),geographic_coverage:z.record(z.unknown()),freshness:z.string(),quality_flags:z.array(z.string()),is_demo:z.boolean(),message:z.string()});
export const sourcesResponse = z.object({items:z.array(sourceStatus),is_demo:z.boolean()});
export const assessment = z.object({assessment_id:z.string(),catchment_id:z.string(),status:assessmentStatus,score:z.number().nullable(),score_semantics:z.string(),model_version:z.string(),issued_at:z.string(),is_demo:z.boolean(),data_coverage:z.object({required_inputs:z.number(),available_inputs:z.number(),missing:z.array(z.string()),stale:z.array(z.string())}),reason_codes:z.array(z.string()),sources:z.array(observation),warnings:z.array(warningItem)});
export type Catchment=z.infer<typeof catchment>; export type Assessment=z.infer<typeof assessment>;
const base=(import.meta.env.VITE_API_BASE_URL as string|undefined)?.replace(/\/$/,'')||'http://localhost:8000/api/v1';
export class ApiError extends Error { constructor(message:string,readonly status?:number){super(message);} }
async function request<T>(path:string,schema:z.ZodType<T>,init?:RequestInit):Promise<T>{
  let response:Response; try{ response=await fetch(`${base}${path}`,{...init,headers:{'Content-Type':'application/json',...init?.headers}}); }catch{throw new ApiError('RidgeWatch API could not be reached. Check VITE_API_BASE_URL and start the backend.');}
  if(!response.ok){let detail=`Request failed (${response.status})`;try{const body=await response.json() as {detail?:unknown};if(typeof body.detail==='string')detail=body.detail;}catch{}throw new ApiError(detail,response.status);}
  const parsed=schema.safeParse(await response.json()); if(!parsed.success) throw new ApiError('The API response did not match the documented RidgeWatch contract.'); return parsed.data;
}
export const api={catchments:()=>request('/catchments',catchmentsResponse),observations:(id:string)=>request(`/catchments/${encodeURIComponent(id)}/observations`,observationsResponse),warnings:(id:string)=>request(`/catchments/${encodeURIComponent(id)}/warnings`,warningsResponse),sources:()=>request('/sources/status',sourcesResponse),assess:(id:string)=>request(`/catchments/${encodeURIComponent(id)}/assessments`,assessment,{method:'POST',body:'{}'})};
