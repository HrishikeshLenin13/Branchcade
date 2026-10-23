import type { z } from 'zod'
import type * as S from './schemas'
export type { Expression, Statement, Program, Value } from '../interpreter/ast'
export type Vec2 = z.infer<typeof S.Vec2Schema>
export type Obstacle = z.infer<typeof S.ObstacleSchema>
export type FloorZone = z.infer<typeof S.FloorZoneSchema>
export type World = z.infer<typeof S.WorldSchema>
export type Goal = z.infer<typeof S.GoalSchema>
export type RobotState = z.infer<typeof S.RobotStateSchema>
export type SensorConfig = z.infer<typeof S.SensorConfigSchema>
export type SensorSnapshot = z.infer<typeof S.SensorSnapshotSchema>
export type ExecutionEvent = z.infer<typeof S.ExecutionEventSchema>
export type SimulationSnapshot = z.infer<typeof S.SimulationSnapshotSchema>
export type Prediction = z.infer<typeof S.PredictionSchema>
export type Probe = z.infer<typeof S.ProbeSchema>
export type EvidenceItem = z.infer<typeof S.EvidenceItemSchema>
export type Hypothesis = z.infer<typeof S.HypothesisSchema>
export type Counterexample = z.infer<typeof S.CounterexampleSchema>
export type LearnerProfile = z.infer<typeof S.LearnerProfileSchema>
export type Mission = z.infer<typeof S.MissionSchema>
export type Attempt = z.infer<typeof S.AttemptSchema>
export type TeamSession = z.infer<typeof S.TeamSessionSchema>
export type AppSettings = z.infer<typeof S.AppSettingsSchema>
export type AppExport = z.infer<typeof S.ExportSchema>
export type Reassessment = z.infer<typeof S.ReassessmentSchema>

export type SavedLab = z.infer<typeof S.SavedLabSchema>
export type Draft = z.infer<typeof S.DraftSchema>
export type Assignment = z.infer<typeof S.AssignmentSchema>
