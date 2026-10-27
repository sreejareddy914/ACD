import React, { useState } from 'react';
import { DarkPatternFinding, ClassificationType } from '../analysis/types';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Flag,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  Clock,
  Layers,
  FileSearch,
  ExternalLink
} from 'lucide-react';

interface FindingCardProps {
  finding: DarkPatternFinding;
  onHighlight: (finding: DarkPatternFinding) => void;
  onDismiss: (findingId: string) => void;
  onFalsePositive: (findingId: string) => void;
  isHighlighted?: boolean;
}

export const FindingCard: React.FC<FindingCardProps> = ({
  finding,
  onHighlight,
  onDismiss,
  onFalsePositive,
  isHighlighted
}) => {
  const [expanded, setExpanded] = useState(false);

  // Classification styling and accessible badges
  const cType: ClassificationType = finding.classification || 'potential_dark_pattern';

  let classBadge = {
    label: 'Potential Dark Pattern',
    bg: 'bg-amber-50 text-amber-800 border-amber-300',
    icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
  };

  if (cType === 'verified_deceptive') {
    classBadge = {
      label: 'Verified Deceptive Behaviour',
      bg: 'bg-rose-50 text-rose-800 border-rose-300',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-rose-600" />
    };
  } else if (cType === 'strong_evidence') {
    classBadge = {
      label: 'Strong Evidence of Dark Pattern',
      bg: 'bg-orange-50 text-orange-800 border-orange-300',
      icon: <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
    };
  } else if (cType === 'insufficient_evidence') {
    classBadge = {
      label: 'Insufficient Evidence',
      bg: 'bg-slate-100 text-slate-700 border-slate-300',
      icon: <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
    };
  }

  // Severity styling
  const sev = finding.severity;
  let sevBadge = 'bg-slate-100 text-slate-700 border-slate-200';
  if (sev === 'critical') sevBadge = 'bg-red-50 text-red-700 border-red-200';
  else if (sev === 'high') sevBadge = 'bg-orange-50 text-orange-700 border-orange-200';
  else if (sev === 'medium') sevBadge = 'bg-amber-50 text-amber-700 border-amber-200';
  else if (sev === 'low') sevBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';

  if (finding.dismissed) {
    return (
      <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 opacity-60 flex items-center justify-between text-xs">
        <span className="line-through text-slate-500 font-medium">{finding.title} (Dismissed)</span>
        <button
          onClick={() => onDismiss(finding.id)}
          className="text-indigo-600 font-semibold hover:underline text-[11px] cursor-pointer"
        >
          Restore
        </button>
      </div>
    );
  }

  if (finding.falsePositive) {
    return (
      <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 opacity-60 flex items-center justify-between text-xs">
        <span className="text-slate-500 font-medium">Marked as False Positive: {finding.title}</span>
        <button
          onClick={() => onFalsePositive(finding.id)}
          className="text-indigo-600 font-semibold hover:underline text-[11px] cursor-pointer"
        >
          Undo
        </button>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-xl border transition-all shadow-xs ${
        isHighlighted ? 'border-orange-500 ring-2 ring-orange-100' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Top Header Card */}
      <div
        className="p-3.5 cursor-pointer flex items-start justify-between gap-2.5"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="space-y-1.5 flex-1 min-w-0">
          {/* Classification & Category Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${classBadge.bg}`}>
              {classBadge.icon}
              <span>{classBadge.label}</span>
            </span>

            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${sevBadge}`}>
              {finding.severity}
            </span>

            <span className="text-[10px] text-slate-500 font-medium">
              {finding.categoryName}
            </span>
          </div>

          <h4 className="text-xs font-bold text-slate-900 leading-snug break-words">
            {finding.title}
          </h4>

          <p className="text-[11px] text-slate-600 line-clamp-2">
            {finding.whyFlagged}
          </p>
        </div>

        <button
          className="p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer mt-0.5 shrink-0"
          aria-label={expanded ? 'Collapse finding details' : 'Expand finding details'}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 text-xs space-y-3">
          {/* 1. Grounded Observed Evidence */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <FileSearch className="w-3.5 h-3.5 text-slate-400" />
                OBSERVED EVIDENCE
              </span>
              <span className="text-[10px] font-medium text-slate-400 capitalize">
                Strength: <strong>{finding.evidenceStrength}</strong>
              </span>
            </div>
            <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200/80 font-mono text-[11px] text-slate-800 leading-relaxed border-l-4 border-l-orange-500 break-words">
              {finding.evidence}
            </div>
          </div>

          {/* 2. Structured Evidence Records & Provenance */}
          {finding.evidenceRecords && finding.evidenceRecords.length > 0 && (
            <div className="bg-slate-50/70 rounded-lg p-2.5 border border-slate-200/70 space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Layers className="w-3 h-3 text-slate-400" />
                VERIFICATION METRICS & PROVENANCE
              </div>
              {finding.evidenceRecords.map((rec, i) => (
                <div key={rec.id || i} className="text-[11px] text-slate-700 space-y-0.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>Record ID: <code>{rec.id}</code></span>
                    <span className="capitalize">Status: <strong>{rec.verificationStatus}</strong> ({rec.provenance.replace('_', ' ')})</span>
                  </div>
                  {rec.elementSelector && (
                    <div className="text-[10px] text-slate-500">
                      Selector: <code className="bg-white px-1 rounded border border-slate-200 text-slate-600">{rec.elementSelector}</code>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 3. Missing Information / Limitations (Transparently states what couldn't be verified) */}
          {((finding.limitations && finding.limitations.length > 0) || (finding.missingEvidence && finding.missingEvidence.length > 0)) && (
            <div className="bg-amber-50/50 rounded-lg p-2.5 border border-amber-200/60 text-amber-900">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-amber-600" />
                KNOWN LIMITATIONS & UNCERTAINTIES
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800/90">
                {finding.limitations?.map((lim, i) => (
                  <li key={i}>{lim}</li>
                ))}
                {finding.missingEvidence?.map((miss, i) => (
                  <li key={`m-${i}`}>Unverified: {miss}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 4. Consumer recommendation */}
          <div className="bg-indigo-50/60 rounded-lg p-2.5 border border-indigo-100 text-indigo-900">
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 mb-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
              RECOMMENDED ACTION
            </div>
            <p className="text-xs leading-relaxed font-medium">
              {finding.recommendedAction}
            </p>
          </div>

          {/* 5. Detection Engine & Element Reference */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
            <span>Detection: <strong className="text-slate-600 font-semibold">{finding.detectionMethod.toUpperCase()} ENGINE</strong></span>
            {finding.elementId && <span>Element ID: {finding.elementId}</span>}
          </div>

          {/* Primary Action Buttons */}
          <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
            {finding.elementId ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onHighlight(finding);
                }}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isHighlighted
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{isHighlighted ? 'Highlighted' : 'Highlight on Page'}</span>
              </button>
            ) : null}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(finding.id);
              }}
              className="py-1.5 px-2.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            >
              Dismiss
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onFalsePositive(finding.id);
              }}
              title="Report false positive"
              className="py-1.5 px-2.5 rounded-lg text-xs font-medium text-slate-500 hover:text-amber-700 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 transition-colors cursor-pointer ml-auto flex items-center gap-1"
            >
              <Flag className="w-3 h-3" />
              <span>False Positive</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
