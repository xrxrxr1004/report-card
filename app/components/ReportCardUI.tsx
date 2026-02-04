import React, { useState, useEffect } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { ChevronDown, ChevronUp, Eye, EyeOff, ChevronRight, Settings } from "lucide-react";
import { Student } from "@/lib/data";
import clsx from "clsx";

interface ReportCardUIProps {
  student: Student;
  selectedCategories: string[];
  isPrint?: boolean;
  forceOpen?: boolean; // 이미지 다운로드용: 모든 섹션 강제로 열기
  isEditing?: boolean; // 코멘트 수정 모드 (상위 컴포넌트에서 제어)
  onCommentChange?: (comment: string) => void; // 코멘트 변경 핸들러
  selectedMetrics?: string[]; // 선택된 지표들 (상위 컴포넌트에서 제어)
  onMetricsChange?: (metrics: string[]) => void; // 지표 선택 변경 핸들러
  showSubjectGrade?: boolean; // 영역별 등급 표시 여부
  onShowSubjectGradeChange?: (show: boolean) => void; // 영역별 등급 표시 변경 핸들러
  reportSettings?: { title: string; subtitle: string }; // 스프레드시트 설정 (제목, 부제)
}

export default function ReportCardUI({ student, selectedCategories, isPrint = false, forceOpen = false, isEditing = false, onCommentChange, selectedMetrics: propSelectedMetrics, onMetricsChange, showSubjectGrade: propShowSubjectGrade, onShowSubjectGradeChange, reportSettings }: ReportCardUIProps) {
  const [showRank, setShowRank] = useState(false);
  const [internalSelectedMetrics, setInternalSelectedMetrics] = useState<string[]>(['grade', 'score', 'growth', 'radarChart', 'growthChart']); // 내부 선택 상태 (props가 없을 때 사용)
  const [internalShowSubjectGrade, setInternalShowSubjectGrade] = useState(true); // 내부 등급 표시 상태 (props가 없을 때 사용)
  const [isMetricsOptionsOpen, setIsMetricsOptionsOpen] = useState(false);
  const metricsOptionsRef = React.useRef<HTMLDivElement>(null);
  const currentWeekData = student.history[student.history.length - 1];

  // props로 전달된 showSubjectGrade가 있으면 사용, 없으면 내부 상태 사용
  const showSubjectGrade = propShowSubjectGrade !== undefined ? propShowSubjectGrade : internalShowSubjectGrade;

  if (!currentWeekData) {
    return (
      <div className="w-[210mm] min-h-[297mm] flex items-center justify-center p-12 bg-white shadow-lg mx-auto mb-8 rounded-lg">
        <div className="text-center text-slate-500">
          <p className="text-xl font-medium mb-2">데이터 없음</p>
          <p>선택한 주차의 성적 데이터가 존재하지 않습니다.</p>
        </div>
      </div>
    );
  }

  const handleShowSubjectGradeChange = (show: boolean) => {
    if (onShowSubjectGradeChange) {
      onShowSubjectGradeChange(show);
    } else {
      setInternalShowSubjectGrade(show);
    }
  };

  // props로 전달된 selectedMetrics가 있으면 사용, 없으면 내부 상태 사용
  const selectedMetrics = propSelectedMetrics !== undefined ? propSelectedMetrics : internalSelectedMetrics;

  const handleMetricsChange = (newMetrics: string[]) => {
    if (onMetricsChange) {
      onMetricsChange(newMetrics);
    } else {
      setInternalSelectedMetrics(newMetrics);
    }
  };

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (metricsOptionsRef.current && !metricsOptionsRef.current.contains(event.target as Node)) {
        setIsMetricsOptionsOpen(false);
      }
    };

    if (isMetricsOptionsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isMetricsOptionsOpen]);

  // 날짜 형식 변환: "2025년 12월 1주차" → "12월 1주차"
  const formatDate = (dateString: string): string => {
    // "2025년 " 부분을 제거
    return dateString.replace(/^\d{4}년\s+/, '');
  };



  // Radar Data Preparation
  // 독해단어 점수: score가 null이어도 score1~8이 있으면 합계 사용
  const vocabScoreForChart = currentWeekData.vocab.score !== null
    ? currentWeekData.vocab.score
    : ((currentWeekData.vocab.score1 ?? 0) +
       (currentWeekData.vocab.score2 ?? 0) +
       (currentWeekData.vocab.score3 ?? 0) +
       (currentWeekData.vocab.score4 ?? 0) +
       (currentWeekData.vocab.score5 ?? 0) +
       (currentWeekData.vocab.score6 ?? 0) +
       (currentWeekData.vocab.score7 ?? 0) +
       (currentWeekData.vocab.score8 ?? 0)) || 0;

  const radarData = [
    // 독해단어: score1~8 중 하나라도 있으면 포함
    ...(((currentWeekData.vocab.score1 !== null && currentWeekData.vocab.score1 !== undefined) ||
      (currentWeekData.vocab.score2 !== null && currentWeekData.vocab.score2 !== undefined) ||
      (currentWeekData.vocab.score3 !== null && currentWeekData.vocab.score3 !== undefined) ||
      (currentWeekData.vocab.score4 !== null && currentWeekData.vocab.score4 !== undefined) ||
      (currentWeekData.vocab.score5 !== null && currentWeekData.vocab.score5 !== undefined) ||
      (currentWeekData.vocab.score6 !== null && currentWeekData.vocab.score6 !== undefined) ||
      (currentWeekData.vocab.score7 !== null && currentWeekData.vocab.score7 !== undefined) ||
      (currentWeekData.vocab.score8 !== null && currentWeekData.vocab.score8 !== undefined) ||
      currentWeekData.vocab.status1 || currentWeekData.vocab.status2 || currentWeekData.vocab.status3)
      ? [{
        subject: "독해단어",
        A: vocabScoreForChart / (
          (currentWeekData.vocab.score1 !== null && currentWeekData.vocab.score1 !== undefined ? (currentWeekData.vocab.max1 || 50) : 0) +
          (currentWeekData.vocab.score2 !== null && currentWeekData.vocab.score2 !== undefined ? (currentWeekData.vocab.max2 || 50) : 0) +
          (currentWeekData.vocab.score3 !== null && currentWeekData.vocab.score3 !== undefined ? (currentWeekData.vocab.max3 || 50) : 0) +
          (currentWeekData.vocab.score4 !== null && currentWeekData.vocab.score4 !== undefined ? (currentWeekData.vocab.max4 || 50) : 0) +
          (currentWeekData.vocab.score5 !== null && currentWeekData.vocab.score5 !== undefined ? (currentWeekData.vocab.max5 || 50) : 0) +
          (currentWeekData.vocab.score6 !== null && currentWeekData.vocab.score6 !== undefined ? (currentWeekData.vocab.max6 || 50) : 0) +
          (currentWeekData.vocab.score7 !== null && currentWeekData.vocab.score7 !== undefined ? (currentWeekData.vocab.max7 || 50) : 0) +
          (currentWeekData.vocab.score8 !== null && currentWeekData.vocab.score8 !== undefined ? (currentWeekData.vocab.max8 || 50) : 0) || 1
        ) * 100,
        fullMark: 100,
        id: "vocab"
      }]
      : []),
    // 문법이론: 점수가 있거나 themes가 있고 길이가 0보다 크면 포함
    // 점수가 null이고 themes도 없거나 빈 배열이면 제외
    ...((currentWeekData.grammarTheory.score !== null ||
      (currentWeekData.grammarTheory.themes && currentWeekData.grammarTheory.themes.length > 0)) &&
      !(currentWeekData.grammarTheory.score === null &&
        (!currentWeekData.grammarTheory.themes || currentWeekData.grammarTheory.themes.length === 0))
      ? [{ subject: "문법이론", A: currentWeekData.grammarTheory.score || 0, fullMark: 100, id: "grammarTheory" }]
      : []),
    // 문법응용: 점수가 있을 때만 포함
    ...(currentWeekData.grammarApp.score !== null
      ? [{
        subject: '문법응용',
        A: ((currentWeekData.grammarApp.score || 0) / ((
          (currentWeekData.grammarApp.max1 || 0) +
          (currentWeekData.grammarApp.max2 || 0) +
          (currentWeekData.grammarApp.max3 || 0) +
          (currentWeekData.grammarApp.max4 || 0)
        ) || 1)) * 100,
        fullMark: 100,
        id: "grammarApp"
      }]
      : []),
    // 모의고사: 점수가 있을 때만 포함
    ...(currentWeekData.mockExam.score !== null
      ? [{ subject: "모의고사", A: ((currentWeekData.mockExam.score || 0) / 100) * 100, fullMark: 100, id: "mockExam" }]
      : []),
    // 내신기출: 점수가 있을 때만 포함
    ...(currentWeekData.internalExam?.score !== null && currentWeekData.internalExam?.score !== undefined
      ? [{ subject: "내신기출", A: ((currentWeekData.internalExam.score || 0) / (currentWeekData.internalExam.maxScore || 100)) * 100, fullMark: 100, id: "internalExam" }]
      : []),
    // 숙제: 점수가 있을 때만 포함 (4개 항목 지원)
    ...(currentWeekData.homework?.score !== null && currentWeekData.homework?.score !== undefined
      ? [{
        subject: "숙제",
        A: ((currentWeekData.homework.score || 0) / (
          (currentWeekData.homework.score1 !== null ? (currentWeekData.homework.max1 || 100) : 0) +
          (currentWeekData.homework.score2 !== null ? (currentWeekData.homework.max2 || 100) : 0) +
          (currentWeekData.homework.score3 !== null ? (currentWeekData.homework.max3 || 100) : 0) +
          (currentWeekData.homework.score4 !== null ? (currentWeekData.homework.max4 || 100) : 0) || 1
        )) * 100,
        fullMark: 100,
        id: "homework"
      }]
      : []),
  ].filter(item => selectedCategories.includes(item.id) || item.id === 'internalExam' || item.id === 'homework');

  // Growth Chart Data Preparation (Last 4 weeks)
  const historyData = student.history.slice(-4).map(h => ({
    week: h.weekId.split('-')[2], // e.g. "W1"
    score: h.totalScore
  }));

  // Calculate Y-axis domain for growth chart
  const scoreValues = historyData.map(d => d.score).filter(v => v != null);
  const minScore = scoreValues.length > 0 ? Math.max(0, Math.min(...scoreValues) - 10) : 0;
  const maxScore = scoreValues.length > 0 ? Math.min(100, Math.max(...scoreValues) + 10) : 100;

  return (
    <div className={clsx(
      "bg-white shadow-lg flex flex-col print:shadow-none print:w-full print:h-auto print:overflow-visible print:text-[10px] print:leading-tight",
      isPrint ? "w-[210mm] min-h-[297mm] print:p-0" : "w-[210mm] min-h-[297mm] p-12",
      isPrint && "print:break-after-page"
    )}>

      <style type="text/css" media="print">
        {`
          @page { size: A4; margin: 5mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; }
          svg { -webkit-print-color-adjust: exact; print-color-adjust: exact; visibility: visible !important; display: block !important; }
          .recharts-wrapper { -webkit-print-color-adjust: exact; print-color-adjust: exact; visibility: visible !important; display: block !important; }
          .recharts-surface { -webkit-print-color-adjust: exact; print-color-adjust: exact; visibility: visible !important; }
          .recharts-radar-polygon { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .recharts-line { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .recharts-dot { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        `}
      </style>

      {/* Header */}
      <header className={clsx("border-b border-slate-200 flex justify-between items-end relative", isPrint ? "pb-1.5 mb-2" : "pb-6 mb-6")}>
        <div>
          <h1 className={clsx("font-light text-slate-800 tracking-tight", isPrint ? "text-lg" : "text-3xl")}>
            {reportSettings?.subtitle || `Weekly Report_${formatDate(currentWeekData.date)}`}
          </h1>
          <p className={clsx("text-slate-500 mt-0.5", isPrint ? "text-[10px]" : "text-base")}>{reportSettings?.title || '양영학원 고등 영어과'}</p>
        </div>
        <div className="text-right">
          <h2 className={clsx("font-medium text-slate-900", isPrint ? "text-xl" : "text-4xl")}>
            <span className={clsx("font-medium text-slate-900", isPrint ? "text-lg" : "text-2xl")}>{student.class}반 </span>
            {student.name}
          </h2>
        </div>

      </header>

      {/* Key Metrics Options */}
      {!isPrint && !forceOpen && (
        <div className="relative mb-4" ref={metricsOptionsRef}>
          <button
            onClick={() => setIsMetricsOptionsOpen(!isMetricsOptionsOpen)}
            className={clsx(
              "flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors",
              "text-base font-medium px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"
            )}
          >
            <Settings className="w-4 h-4" />
            <span>지표 선택</span>
            <ChevronDown
              className={clsx(
                "w-4 h-4 transition-transform duration-200",
                isMetricsOptionsOpen ? "rotate-180" : ""
              )}
            />
          </button>

          {isMetricsOptionsOpen && (
            <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg p-3 z-50 min-w-[200px]">
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={selectedMetrics.includes('grade')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleMetricsChange([...selectedMetrics, 'grade']);
                      } else {
                        handleMetricsChange(selectedMetrics.filter(m => m !== 'grade'));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-base text-slate-700">종합 등급</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={selectedMetrics.includes('score')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleMetricsChange([...selectedMetrics, 'score']);
                      } else {
                        handleMetricsChange(selectedMetrics.filter(m => m !== 'score'));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-base text-slate-700">종합 점수</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={selectedMetrics.includes('growth')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleMetricsChange([...selectedMetrics, 'growth']);
                      } else {
                        handleMetricsChange(selectedMetrics.filter(m => m !== 'growth'));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-base text-slate-700">전주 대비</span>
                </label>
                <div className="border-t border-slate-200 pt-2 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={showSubjectGrade}
                      onChange={(e) => handleShowSubjectGradeChange(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-base text-slate-700">영역별 등급 표시</span>
                  </label>
                </div>
                <div className="border-t border-slate-200 pt-2 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={selectedMetrics.includes('radarChart')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleMetricsChange([...selectedMetrics, 'radarChart']);
                        } else {
                          handleMetricsChange(selectedMetrics.filter(m => m !== 'radarChart'));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-base text-slate-700">영역별 밸런스</span>
                  </label>
                </div>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={selectedMetrics.includes('growthChart')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleMetricsChange([...selectedMetrics, 'growthChart']);
                      } else {
                        handleMetricsChange(selectedMetrics.filter(m => m !== 'growthChart'));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-base text-slate-700">성적 변화 추이</span>
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Key Metrics (KPI) */}
      {(() => {
        // KPI 카드만 필터링 (그래프 제외)
        const kpiMetrics = selectedMetrics.filter(m => ['grade', 'score', 'growth'].includes(m));
        return kpiMetrics.length > 0;
      })() && (
          <section className={clsx(
            "grid gap-4",
            (() => {
              // KPI 카드만 필터링 (그래프 제외)
              const kpiMetrics = selectedMetrics.filter(m => ['grade', 'score', 'growth'].includes(m));
              return kpiMetrics.length === 1 ? "grid-cols-1" : kpiMetrics.length === 2 ? "grid-cols-2" : "grid-cols-3";
            })(),
            isPrint ? "mb-2 gap-2" : "mb-6"
          )}>
            {/* Grade Card with Toggle Interaction */}
            {selectedMetrics.includes('grade') && (
              <div
                onClick={() => setShowRank(!showRank)}
                className={clsx(
                  "bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col gap-1 print:border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors relative group",
                  isPrint ? "p-2.5" : "p-5 gap-2"
                )}
              >
                <div className="flex justify-between items-start">
                  <span className={clsx("text-slate-500 font-light", isPrint ? "text-[11px]" : "text-base")}>
                    {showRank ? "전체 석차" : "종합 등급"}
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400">
                    {showRank ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </div>
                </div>
                <div>
                  <span className={clsx("font-semibold text-slate-800", isPrint ? "text-xl" : "text-3xl")}>
                    {showRank
                      ? (
                        <span className="flex items-center gap-1">
                          {currentWeekData.totalRank} / {currentWeekData.totalStudents}
                        </span>
                      )
                      : (
                        <span className="flex items-center gap-1">
                          {currentWeekData.totalGrade}등급
                        </span>
                      )
                    }
                  </span>
                </div>
              </div>
            )}

            {selectedMetrics.includes('score') && (
              <MetricCard
                label="종합 점수"
                value={`${currentWeekData.totalScore}점`}
                subtext=""
                isPrint={isPrint}
              />
            )}

            {selectedMetrics.includes('growth') && (
              <MetricCard
                label="전주 대비"
                value={`${currentWeekData.growth > 0 ? '+' : ''}${currentWeekData.growth}점`}
                subtext="지난주 점수 비교"
                isPositive={currentWeekData.growth >= 0}
                isPrint={isPrint}
              />
            )}
          </section>
        )}

      {/* Charts Section */}
      {(selectedMetrics.includes('radarChart') || selectedMetrics.includes('growthChart')) && (
        <div className={clsx(
          "grid",
          selectedMetrics.includes('radarChart') && selectedMetrics.includes('growthChart') ? "grid-cols-2" : "grid-cols-1",
          isPrint ? "gap-2.5 mb-2" : "gap-6 mb-6"
        )}>
          {/* Radar Chart */}
          {selectedMetrics.includes('radarChart') && (
            <div className={clsx("bg-slate-50 rounded-xl border border-slate-100 print:bg-white print:border-slate-200 flex flex-col items-center justify-center", isPrint ? "p-2 min-h-[160px]" : "p-4")}>
              <h3 className={clsx("font-medium text-slate-500 uppercase tracking-wider text-center", isPrint ? "text-[11px] mb-1" : "text-base mb-2")}>영역별 밸런스</h3>
              {radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={isPrint ? 150 : 200}>
                  <RadarChart cx="50%" cy="50%" outerRadius={isPrint ? "75%" : "75%"} data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: isPrint ? 9 : 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="Student"
                      dataKey="A"
                      stroke="#2563EB"
                      strokeWidth={isPrint ? 1.5 : 2}
                      fill="#3B82F6"
                      fillOpacity={0.3}
                      isAnimationActive={!isPrint}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className={clsx("text-slate-400", isPrint ? "text-[9px]" : "text-base")}>데이터 없음</div>
              )}
            </div>
          )}

          {/* Growth Chart */}
          {selectedMetrics.includes('growthChart') && (
            <div className={clsx("bg-slate-50 rounded-xl border border-slate-100 print:bg-white print:border-slate-200 flex flex-col items-center justify-center", isPrint ? "p-2 min-h-[160px]" : "p-4")}>
              <h3 className={clsx("font-medium text-slate-500 uppercase tracking-wider text-center", isPrint ? "text-[11px] mb-1" : "text-base mb-2")}>성적 변화 추이</h3>
              {historyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={isPrint ? 150 : 200}>
                  <LineChart data={historyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: isPrint ? 9 : 10 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[minScore, maxScore]} tick={{ fill: '#64748b', fontSize: isPrint ? 9 : 10 }} axisLine={false} tickLine={false} width={25} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#2563EB"
                      strokeWidth={isPrint ? 1.5 : 2}
                      dot={{ r: isPrint ? 2 : 3, fill: "#2563EB", strokeWidth: 1, stroke: "#fff" }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={!isPrint}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className={clsx("text-slate-400", isPrint ? "text-[9px]" : "text-base")}>데이터 없음</div>
              )}
            </div>
          )}
        </div>
      )}
      {/* Detailed Analysis Sections */}
      <div className={clsx("space-y-4", isPrint && "space-y-1.5")}>
        <h3 className={clsx("font-medium text-slate-800 border-b border-slate-200 pb-0.5", isPrint ? "mt-0 text-[11px] mb-1.5" : "mt-2 text-xl")}>영역별 상세 분석</h3>

        {/* 2.1 독해단어 */}
        {selectedCategories.includes("vocab") && (
          <SubjectSection
            title={currentWeekData.vocab.title || "독해단어 (Vocabulary)"}
            score={
              // score가 null이어도 score1 또는 score2가 있으면 합계 표시
              currentWeekData.vocab.score !== null
                ? currentWeekData.vocab.score
                : ((currentWeekData.vocab.score1 ?? 0) + (currentWeekData.vocab.score2 ?? 0)) || null
            }
            maxScore={
              // 실제 응시한 시험의 최대 점수 합계 (8개 주차 모두)
              (currentWeekData.vocab.score1 !== null && currentWeekData.vocab.score1 !== undefined ? (currentWeekData.vocab.max1 || 50) : 0) +
              (currentWeekData.vocab.score2 !== null && currentWeekData.vocab.score2 !== undefined ? (currentWeekData.vocab.max2 || 50) : 0) +
              (currentWeekData.vocab.score3 !== null && currentWeekData.vocab.score3 !== undefined ? (currentWeekData.vocab.max3 || 50) : 0) +
              (currentWeekData.vocab.score4 !== null && currentWeekData.vocab.score4 !== undefined ? (currentWeekData.vocab.max4 || 50) : 0) +
              (currentWeekData.vocab.score5 !== null && currentWeekData.vocab.score5 !== undefined ? (currentWeekData.vocab.max5 || 50) : 0) +
              (currentWeekData.vocab.score6 !== null && currentWeekData.vocab.score6 !== undefined ? (currentWeekData.vocab.max6 || 50) : 0) +
              (currentWeekData.vocab.score7 !== null && currentWeekData.vocab.score7 !== undefined ? (currentWeekData.vocab.max7 || 50) : 0) +
              (currentWeekData.vocab.score8 !== null && currentWeekData.vocab.score8 !== undefined ? (currentWeekData.vocab.max8 || 50) : 0) || 90
            }
            grade={currentWeekData.vocab.grade}
            rank={currentWeekData.vocab.rank}
            tiedCount={currentWeekData.vocab.tiedCount}
            totalStudents={currentWeekData.totalStudents}
            isPrint={isPrint}
            forceOpen={forceOpen}
            showGrade={showSubjectGrade}
          >
            {/* 독해단어 항목 동적 표시 (score1, score2, score3 등이 있으면 표시) */}
            {/* 독해단어 세부 점수 그리드 */}
            <div className={clsx(
              "grid gap-4",
              isPrint ? "mt-1 gap-2" : "mt-4",
              // 동적으로 컬럼 수 조정 (최대 3열, 4개 이상이면 2열/3열 등)
              "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
            )}>
              {/* 독해단어 1 */}
              {(currentWeekData.vocab.max1 || 0) > 0 && (
                <div className={clsx("bg-slate-50 rounded-md text-center", isPrint ? "p-1.5" : "p-3")}>
                  <div className={clsx("text-slate-500 mb-0.5", isPrint ? "text-[10px]" : "text-sm")}>
                    {currentWeekData.vocab.itemName1 || "Week1"}
                  </div>
                  <div className={clsx("font-semibold text-slate-700", isPrint ? "text-[12px]" : "text-xl")}>
                    {currentWeekData.vocab.score1 !== null && currentWeekData.vocab.score1 !== undefined
                      ? `${currentWeekData.vocab.score1} / ${currentWeekData.vocab.max1 || 50}`
                      : "미응시"}
                  </div>
                </div>
              )}

              {/* 독해단어 2 */}
              {(currentWeekData.vocab.max2 || 0) > 0 && (
                <div className={clsx("bg-slate-50 rounded-md text-center", isPrint ? "p-1.5" : "p-3")}>
                  <div className={clsx("text-slate-500 mb-0.5", isPrint ? "text-[10px]" : "text-sm")}>
                    {currentWeekData.vocab.itemName2 || "Week2-1"}
                  </div>
                  <div className={clsx("font-semibold text-slate-700", isPrint ? "text-[12px]" : "text-xl")}>
                    {currentWeekData.vocab.score2 !== null && currentWeekData.vocab.score2 !== undefined
                      ? `${currentWeekData.vocab.score2} / ${currentWeekData.vocab.max2 || 50}`
                      : "미응시"}
                  </div>
                </div>
              )}

              {/* 독해단어 3 */}
              {(currentWeekData.vocab.max3 || 0) > 0 && (
                <div className={clsx("bg-slate-50 rounded-md text-center", isPrint ? "p-1.5" : "p-3")}>
                  <div className={clsx("text-slate-500 mb-0.5", isPrint ? "text-[10px]" : "text-sm")}>
                    {currentWeekData.vocab.itemName3 || "Week2-2"}
                  </div>
                  <div className={clsx("font-semibold text-slate-700", isPrint ? "text-[12px]" : "text-xl")}>
                    {currentWeekData.vocab.score3 !== null && currentWeekData.vocab.score3 !== undefined
                      ? `${currentWeekData.vocab.score3} / ${currentWeekData.vocab.max3 || 50}`
                      : "미응시"}
                  </div>
                </div>
              )}

              {/* 독해단어 4 */}
              {(currentWeekData.vocab.max4 || 0) > 0 && (
                <div className={clsx("bg-slate-50 rounded-md text-center", isPrint ? "p-1.5" : "p-3")}>
                  <div className={clsx("text-slate-500 mb-0.5", isPrint ? "text-[10px]" : "text-sm")}>
                    {currentWeekData.vocab.itemName4 || "Week3-1"}
                  </div>
                  <div className={clsx("font-semibold text-slate-700", isPrint ? "text-[12px]" : "text-xl")}>
                    {currentWeekData.vocab.score4 !== null && currentWeekData.vocab.score4 !== undefined
                      ? `${currentWeekData.vocab.score4} / ${currentWeekData.vocab.max4 || 50}`
                      : "미응시"}
                  </div>
                </div>
              )}

              {/* 독해단어 5 */}
              {(currentWeekData.vocab.max5 || 0) > 0 && (
                <div className={clsx("bg-slate-50 rounded-md text-center", isPrint ? "p-1.5" : "p-3")}>
                  <div className={clsx("text-slate-500 mb-0.5", isPrint ? "text-[10px]" : "text-sm")}>
                    {currentWeekData.vocab.itemName5 || "독해단어 5"}
                  </div>
                  <div className={clsx("font-semibold text-slate-700", isPrint ? "text-[12px]" : "text-xl")}>
                    {currentWeekData.vocab.score5 !== null && currentWeekData.vocab.score5 !== undefined
                      ? `${currentWeekData.vocab.score5} / ${currentWeekData.vocab.max5 || 50}`
                      : (currentWeekData.vocab.status5 || '미응시')}
                  </div>
                </div>
              )}

              {/* 독해단어 6 */}
              {(currentWeekData.vocab.max6 || 0) > 0 && (
                <div className={clsx("bg-slate-50 rounded-md text-center", isPrint ? "p-1.5" : "p-3")}>
                  <div className={clsx("text-slate-500 mb-0.5", isPrint ? "text-[10px]" : "text-sm")}>
                    {currentWeekData.vocab.itemName6 || "독해단어 6"}
                  </div>
                  <div className={clsx("font-semibold text-slate-700", isPrint ? "text-[12px]" : "text-xl")}>
                    {currentWeekData.vocab.score6 !== null && currentWeekData.vocab.score6 !== undefined
                      ? `${currentWeekData.vocab.score6} / ${currentWeekData.vocab.max6 || 50}`
                      : (currentWeekData.vocab.status6 || '미응시')}
                  </div>
                </div>
              )}

              {/* 독해단어 7 */}
              {(currentWeekData.vocab.max7 || 0) > 0 && (
                <div className={clsx("bg-slate-50 rounded-md text-center", isPrint ? "p-1.5" : "p-3")}>
                  <div className={clsx("text-slate-500 mb-0.5", isPrint ? "text-[10px]" : "text-sm")}>
                    {currentWeekData.vocab.itemName7 || "독해단어 7"}
                  </div>
                  <div className={clsx("font-semibold text-slate-700", isPrint ? "text-[12px]" : "text-xl")}>
                    {currentWeekData.vocab.score7 !== null && currentWeekData.vocab.score7 !== undefined
                      ? `${currentWeekData.vocab.score7} / ${currentWeekData.vocab.max7 || 50}`
                      : (currentWeekData.vocab.status7 || '미응시')}
                  </div>
                </div>
              )}

              {/* 독해단어 8 */}
              {(currentWeekData.vocab.max8 || 0) > 0 && (
                <div className={clsx("bg-slate-50 rounded-md text-center", isPrint ? "p-1.5" : "p-3")}>
                  <div className={clsx("text-slate-500 mb-0.5", isPrint ? "text-[10px]" : "text-sm")}>
                    {currentWeekData.vocab.itemName8 || "독해단어 8"}
                  </div>
                  <div className={clsx("font-semibold text-slate-700", isPrint ? "text-[12px]" : "text-xl")}>
                    {currentWeekData.vocab.score8 !== null && currentWeekData.vocab.score8 !== undefined
                      ? `${currentWeekData.vocab.score8} / ${currentWeekData.vocab.max8 || 50}`
                      : (currentWeekData.vocab.status8 || '미응시')}
                  </div>
                </div>
              )}
            </div>
          </SubjectSection>
        )
        }

        {/* 2.2 문법이론 - 제거됨 */}

        {/* 2.3 문법 확인학습 (Grammar Check) */}
        {
          selectedCategories.includes("grammarApp") && (
            <SubjectSection
              title={currentWeekData.grammarApp.title || "문법 확인학습 (Grammar Check)"}
              subtitle={currentWeekData.grammarApp.subtitle}
              score={currentWeekData.grammarApp.score}
              maxScore={
                (currentWeekData.grammarApp.max1 || 0) +
                (currentWeekData.grammarApp.max2 || 0) +
                (currentWeekData.grammarApp.max3 || 0) +
                (currentWeekData.grammarApp.max4 || 0)
              }
              grade={currentWeekData.grammarApp.grade}
              rank={currentWeekData.grammarApp.rank}
              tiedCount={currentWeekData.grammarApp.tiedCount}
              totalStudents={currentWeekData.totalStudents}
              isPrint={isPrint}
              forceOpen={forceOpen}
              showGrade={showSubjectGrade}
            >
              {/* 문법 확인학습 세부 점수 그리드 - 설정된 항목만 동적 표시 */}
              {(() => {
                // 표시할 항목 수 계산
                const grammarItems = [
                  { max: currentWeekData.grammarApp.max1, score: currentWeekData.grammarApp.score1, name: currentWeekData.grammarApp.itemName1, default: "문법 확인학습 1" },
                  { max: currentWeekData.grammarApp.max2, score: currentWeekData.grammarApp.score2, name: currentWeekData.grammarApp.itemName2, default: "문법 확인학습 2" },
                  { max: currentWeekData.grammarApp.max3, score: currentWeekData.grammarApp.score3, name: currentWeekData.grammarApp.itemName3, default: "문법 확인학습 3" },
                  { max: currentWeekData.grammarApp.max4, score: currentWeekData.grammarApp.score4, name: currentWeekData.grammarApp.itemName4, default: "문법 확인학습 4" },
                ].filter(item => (item.max || 0) > 0);
                
                const colsClass = grammarItems.length === 1 ? "grid-cols-1" 
                  : grammarItems.length === 2 ? "grid-cols-2" 
                  : grammarItems.length === 3 ? "grid-cols-3" 
                  : "grid-cols-4";
                
                return grammarItems.length > 0 ? (
                  <div className={clsx("grid gap-4", isPrint ? "mt-1 gap-2" : "mt-4", colsClass)}>
                    {grammarItems.map((item, idx) => (
                      <div key={idx} className={clsx("bg-slate-50 rounded-md text-center", isPrint ? "p-1.5" : "p-3")}>
                        <div className={clsx("text-slate-500 mb-0.5", isPrint ? "text-[10px]" : "text-sm")}>
                          {item.name || item.default}
                        </div>
                        <div className={clsx("font-semibold text-slate-700", isPrint ? "text-[12px]" : "text-xl")}>
                          {item.score !== null && item.score !== undefined
                            ? `${item.score} / ${item.max || 100}`
                            : "미응시"}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null;
              })()}

              {currentWeekData.grammarApp.wrongAnswers.length > 0 ? (
                <div className={clsx("space-y-1", isPrint ? "mt-1" : "mt-4")}>
                  {currentWeekData.grammarApp.wrongAnswers.map((item, idx) => (
                    <div key={idx} className={clsx("flex items-center justify-between bg-slate-50 rounded-md", isPrint ? "p-1.5 text-[10px]" : "p-3 text-base")}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-700">{item.theme}</span>
                        <span className="text-slate-400">|</span>
                        <span className="text-slate-600">{item.count}문제 오답</span>
                      </div>
                      <div className="text-slate-500">
                        문제 번호: {item.questionNumbers.join(", ")}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </SubjectSection>
          )
        }

        {/* 2.4 모의고사 (2개 모의고사 지원) */}
        {
          selectedCategories.includes("mockExam") && (
            <SubjectSection
              title={currentWeekData.mockExam.title || "모의고사 (Mock Exam)"}
              subtitle={currentWeekData.mockExam.subtitle}
              score={currentWeekData.mockExam.score}
              maxScore={
                (currentWeekData.mockExam.score1 !== null && currentWeekData.mockExam.score1 !== undefined ? (currentWeekData.mockExam.max1 || 100) : 0) +
                (currentWeekData.mockExam.score2 !== null && currentWeekData.mockExam.score2 !== undefined ? (currentWeekData.mockExam.max2 || 100) : 0) || 100
              }
              grade={currentWeekData.mockExam.grade}
              rank={currentWeekData.mockExam.rank}
              tiedCount={currentWeekData.mockExam.tiedCount}
              totalStudents={currentWeekData.totalStudents}
              isPrint={isPrint}
              forceOpen={forceOpen}
              showGrade={showSubjectGrade}
            >
              {/* 모의고사 개별 점수 표시 (score1, score2가 있을 때) */}
              {(() => {
                const mockExamItems = [
                  { score: currentWeekData.mockExam.score1, max: currentWeekData.mockExam.max1, name: currentWeekData.mockExam.itemName1, default: "모의고사 1" },
                  { score: currentWeekData.mockExam.score2, max: currentWeekData.mockExam.max2, name: currentWeekData.mockExam.itemName2, default: "모의고사 2" },
                ].filter(item => item.score !== null && item.score !== undefined);

                return mockExamItems.length > 0 ? (
                  <div className={clsx(
                    "grid gap-4",
                    isPrint ? "mt-1 gap-2" : "mt-4",
                    mockExamItems.length === 1 ? "grid-cols-1" : "grid-cols-2"
                  )}>
                    {mockExamItems.map((item, idx) => (
                      <div key={idx} className={clsx("bg-slate-50 rounded-md text-center", isPrint ? "p-1.5" : "p-3")}>
                        <div className={clsx("text-slate-500 mb-0.5", isPrint ? "text-[10px]" : "text-sm")}>
                          {item.name || item.default}
                        </div>
                        <div className={clsx("font-semibold text-slate-700", isPrint ? "text-[12px]" : "text-xl")}>
                          {item.score} / {item.max || 100}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null;
              })()}
              {currentWeekData.mockExam.wrongQuestions.length > 0 ? (
                <>
                  <div className={clsx("grid grid-cols-2 gap-4", isPrint ? "mt-1 mb-1 gap-2" : "mt-4 mb-4")}>
                    <div className={clsx("bg-slate-50 rounded-md text-center", isPrint ? "p-1.5" : "p-3")}>
                      <div className={clsx("text-slate-500 mb-0.5", isPrint ? "text-[10px]" : "text-sm")}>중심내용 파악</div>
                      <div className={clsx("font-semibold text-slate-700", isPrint ? "text-[12px]" : "text-xl")}>{currentWeekData.mockExam.mainIdeaScore}%</div>
                    </div>
                    <div className={clsx("bg-slate-50 rounded-md text-center", isPrint ? "p-1.5" : "p-3")}>
                      <div className={clsx("text-slate-500 mb-0.5", isPrint ? "text-[10px]" : "text-sm")}>세부내용 파악</div>
                      <div className={clsx("font-semibold text-slate-700", isPrint ? "text-[12px]" : "text-xl")}>{currentWeekData.mockExam.detailScore}%</div>
                    </div>
                  </div>
                  <div className={clsx("space-y-0.5", isPrint ? "mt-1" : "")}>
                    <p className={clsx("text-slate-500 mb-0.5", isPrint ? "text-[10px]" : "text-sm")}>주요 오답 노트</p>
                    {currentWeekData.mockExam.wrongQuestions.map((q, idx) => (
                      <div key={idx} className={clsx("flex justify-between border-b border-slate-100 py-0.5 last:border-0", isPrint ? "text-[10px]" : "text-base")}>
                        <span className="text-slate-600">{q.number}번</span>
                        <span className="text-slate-400">{q.type}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </SubjectSection>
          )
        }

        {/* 2.5 내신기출 */}

        {/* 2.5 내신기출 - 제거됨 */}

        {/* 2.6 숙제 (4개 항목 지원) */}
        {
          (currentWeekData.homework?.score !== null || (currentWeekData.homework?.weight && currentWeekData.homework?.weight > 0)) && (
            <SubjectSection
              title={currentWeekData.homework?.title || "숙제 (Homework)"}
              score={currentWeekData.homework?.score}
              maxScore={
                (currentWeekData.homework?.score1 !== null ? (currentWeekData.homework?.max1 || 100) : 0) +
                (currentWeekData.homework?.score2 !== null ? (currentWeekData.homework?.max2 || 100) : 0) +
                (currentWeekData.homework?.score3 !== null ? (currentWeekData.homework?.max3 || 100) : 0) +
                (currentWeekData.homework?.score4 !== null ? (currentWeekData.homework?.max4 || 100) : 0) || 100
              }
              grade={0} // 등급 없음
              rank={0} // 석차 없음
              totalStudents={currentWeekData.totalStudents}
              isPrint={isPrint}
              forceOpen={forceOpen}
              showGrade={false}
            >
              {/* 숙제 세부 점수 그리드 (4개 항목 지원) */}
              {(() => {
                const homeworkItems = [
                  { score: currentWeekData.homework?.score1, max: currentWeekData.homework?.max1, name: currentWeekData.homework?.itemName1, default: "숙제 1" },
                  { score: currentWeekData.homework?.score2, max: currentWeekData.homework?.max2, name: currentWeekData.homework?.itemName2, default: "숙제 2" },
                  { score: currentWeekData.homework?.score3, max: currentWeekData.homework?.max3, name: currentWeekData.homework?.itemName3, default: "숙제 3" },
                  { score: currentWeekData.homework?.score4, max: currentWeekData.homework?.max4, name: currentWeekData.homework?.itemName4, default: "숙제 4" },
                ].filter(item => item.score !== null && item.score !== undefined);

                const colsClass = homeworkItems.length === 1 ? "grid-cols-1"
                  : homeworkItems.length === 2 ? "grid-cols-2"
                  : homeworkItems.length === 3 ? "grid-cols-3"
                  : "grid-cols-4";

                return homeworkItems.length > 0 ? (
                  <div className={clsx("grid gap-4", isPrint ? "mt-1 gap-2" : "mt-4", colsClass)}>
                    {homeworkItems.map((item, idx) => (
                      <div key={idx} className={clsx("bg-slate-50 rounded-md text-center", isPrint ? "p-1.5" : "p-3")}>
                        <div className={clsx("text-slate-500 mb-0.5", isPrint ? "text-[10px]" : "text-sm")}>
                          {item.name || item.default}
                        </div>
                        <div className={clsx("font-semibold text-slate-700", isPrint ? "text-[12px]" : "text-xl")}>
                          {item.score} / {item.max || 100}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null;
              })()}
            </SubjectSection>
          )
        }

      </div >

      {/* Comprehensive Analysis Comment Section - Full Width Bottom */}
      <section className={clsx(
        "bg-slate-50 border border-slate-200 rounded-xl flex flex-col",
        isPrint ? "p-2 mt-1.5" : "p-6 mt-6 min-h-[150px]"
      )}>
        <h3 className={clsx("font-semibold text-slate-800 mb-1 flex items-center gap-2", isPrint ? "text-[11px]" : "text-lg")}>
          종합 분석 (Comprehensive Analysis)
        </h3>

        {isEditing ? (
          <textarea
            className="w-full h-full p-2 border border-slate-300 rounded-md text-base text-slate-700 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={currentWeekData.comment || ""}
            onChange={(e) => {
              currentWeekData.comment = e.target.value;
              onCommentChange?.(e.target.value);
            }}
          />
        ) : (
          <div className={clsx("text-slate-700 text-justify", isPrint ? "text-[10px] leading-snug tracking-tight" : "text-lg leading-relaxed")}>
            {(currentWeekData.comment || "코멘트가 없습니다.").replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim()}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className={clsx("border-t border-slate-200 text-center text-slate-400 font-light", isPrint ? "mt-1 pt-1 text-[9px]" : "mt-auto pt-8 text-sm")} >
        <p>{reportSettings?.title || '양영학원 고등 영어과'}</p>
        <p>본 성적표는 학생의 학습 향상을 위해 제공되는 자료입니다.</p>
      </footer>
    </div >
  );
}

function MetricCard({ label, value, subtext, isPositive, isPrint }: any) {
  return (
    <div className={clsx(
      "bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col gap-1 print:border-slate-200",
      isPrint ? "p-2.5" : "p-5 gap-2"
    )}>
      <div className="flex justify-between items-start">
        <span className={clsx("text-slate-500 font-light", isPrint ? "text-[11px]" : "text-base")}>{label}</span>
      </div>
      <div>
        <span className={clsx("font-semibold text-slate-800", isPrint ? "text-lg" : "text-2xl")}>{value}</span>
      </div>
      {subtext && (
        <p className={clsx(
          isPrint ? "text-[11px]" : "text-sm",
          isPositive === undefined ? 'text-slate-400' : isPositive ? 'text-green-600' : 'text-red-600'
        )}>
          {subtext}
        </p>
      )}
    </div >
  );
}

function SubjectSection({ title, subtitle, score, maxScore, grade, rank, tiedCount, totalStudents, children, isPrint, forceOpen, showGrade = true }: any) {
  // 인쇄 모드 또는 forceOpen일 때는 항상 열려있어야 함
  const [isOpen, setIsOpen] = useState(isPrint || forceOpen ? true : false);
  const [showRank, setShowRank] = useState(false);
  const hasDetails = !!children;

  // 인쇄 모드 또는 forceOpen일 때 강제로 열기
  useEffect(() => {
    if (isPrint || forceOpen) {
      setIsOpen(true);
    }
  }, [isPrint, forceOpen]);

  const handleGradeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowRank(!showRank);
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden print:break-inside-avoid">
      <div
        className={clsx(
          "bg-white flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors",
          isPrint ? "p-1 py-1.5" : "p-4",
          isOpen && "bg-slate-50"
        )}
        onClick={() => hasDetails && !isPrint && !forceOpen && setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          {hasDetails && !isPrint && !forceOpen && (
            <div className="text-slate-400">
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          )}
          <div className="flex flex-col">
            <span className={clsx("font-medium text-slate-700", isPrint ? "text-[12px]" : "text-lg")}>{title}</span>
            {subtitle && (
              <span className={clsx("text-slate-400 font-normal", isPrint ? "text-[9px] mt-0.5" : "text-xs mt-0.5")}>{subtitle}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className={clsx("text-slate-400 block", isPrint ? "text-[10px]" : "text-sm")}>점수</span>
            <span className={clsx("font-semibold text-slate-800", isPrint ? "text-[12px]" : "text-lg")}>
              {score !== null ? `${score} / ${maxScore}` : '미응시'}
            </span>
          </div>
          {showGrade && (
            <div
              className={clsx("text-right cursor-pointer hover:bg-slate-100 rounded px-2 py-1 -mr-2 transition-colors", isPrint ? "w-20" : "w-24")}
              onClick={handleGradeClick}
            >
              <span className={clsx("text-slate-400 block flex justify-end items-center gap-1", isPrint ? "text-[10px]" : "text-sm")}>
                {showRank ? "석차" : "등급"}
              </span>
              <span className={clsx(
                "font-semibold",
                !showRank && grade === 1 ? "text-blue-600" : "text-slate-800",
                isPrint ? "text-[12px]" : "text-lg"
              )}>
                {score !== null ? (
                  showRank
                    ? (rank
                      ? <><span className={isPrint ? "text-[11px]" : "text-base"}>{rank}/{totalStudents}</span>{tiedCount != null && tiedCount > 1 && <span className="text-[11px] text-slate-400 ml-1 block">동점자{tiedCount}</span>}</>
                      : '-')
                    : (grade
                      ? <><span className={isPrint ? "text-[11px]" : "text-base"}>{grade}등급</span>{tiedCount != null && tiedCount > 1 && <span className="text-[11px] text-slate-400 ml-1 block">동점자{tiedCount}</span>}</>
                      : '-')
                ) : (
                  '-'
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {(isOpen || isPrint) && children && (
        <div className={clsx("bg-white border-t border-slate-100", isPrint ? "p-1.5 py-2" : "p-4 animate-in slide-in-from-top-2 duration-200")}>
          {children}
        </div>
      )}
    </div>
  );
}
