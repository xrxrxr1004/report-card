"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Download, Users, Filter, Check, Loader2, Image, DownloadCloud, Search, FileSpreadsheet, Sparkles, ChevronDown, RefreshCw } from "lucide-react";
import { Student, MOCK_STUDENTS } from "@/lib/data";
import { useReactToPrint } from "react-to-print";
import { toPng } from "html-to-image";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import clsx from "clsx";
import ReportCardUI from "./components/ReportCardUI";

export default function ReportCard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isImageDownloading, setIsImageDownloading] = useState(false);
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });
  const [shouldRenderBatchView, setShouldRenderBatchView] = useState(false);
  const [shouldRenderPrintView, setShouldRenderPrintView] = useState(false);
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [refiningProgress, setRefiningProgress] = useState({ current: 0, total: 0 });
  const [refiningStartTime, setRefiningStartTime] = useState<number | null>(null);
  const [currentProcessingStudent, setCurrentProcessingStudent] = useState<string>('');
  const [isImageMenuOpen, setIsImageMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false); // 새로고침 상태
  const [isAIMenuOpen, setIsAIMenuOpen] = useState(false);
  // 초기값은 빈 배열로 설정하고, 데이터 로드 후 자동으로 채워짐
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['grade', 'score', 'growth', 'radarChart', 'growthChart']); // 선택된 지표들
  const [showSubjectGrade, setShowSubjectGrade] = useState<boolean>(true); // 영역별 등급 표시 여부
  const [currentWeekId, setCurrentWeekId] = useState<string>(''); // 초기값 비워둠
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]); // 사용 가능한 주차 목록
  const [reportSettings, setReportSettings] = useState<{ title: string; subtitle: string; currentWeekId?: string }>({ 
    title: '양영학원 고등 영어과', 
    subtitle: '',
    currentWeekId: ''
  }); // 스프레드시트에서 가져온 설정

  // 주차 목록 불러오기
  useEffect(() => {
    async function fetchWeeks() {
      try {
        const res = await fetch('/api/weeks');
        const weeks = await res.json();
        if (Array.isArray(weeks) && weeks.length > 0) {
          setAvailableWeeks(weeks);
          // 현재 주차가 설정되지 않았거나 유효하지 않은 경우 최신 주차로 설정
          if (!currentWeekId || !weeks.includes(currentWeekId)) {
            setCurrentWeekId(weeks[0]);
          }
        } else {
          // Fallback if no weeks found or error
          const defaultWeek = '2025-12-W1';
          setAvailableWeeks([defaultWeek]);
          if (!currentWeekId) setCurrentWeekId(defaultWeek);
        }
      } catch (error) {
        console.error("Failed to fetch weeks:", error);
        const defaultWeek = '2025-12-W1';
        setAvailableWeeks([defaultWeek]);
        if (!currentWeekId) setCurrentWeekId(defaultWeek);
      }
    }
    fetchWeeks();
  }, []);

  useEffect(() => {
    if (!currentWeekId) return; // weekId가 없으면 데이터 fetch 스킵

    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/students?weekId=${currentWeekId}&t=${Date.now()}`, { cache: 'no-store' });
        const response = await res.json();
        
        // API 응답에서 students와 settings 분리
        const data = response.students || response; // 이전 형식 호환
        const settings = response.settings;
        
        if (settings) {
          setReportSettings(settings);
        }
        
        if (Array.isArray(data) && data.length > 0) {
          setStudents(data);
          // 선택된 학생이 있으면 유지, 없으면 첫 번째 학생 선택
          if (!selectedStudentId || !data.find((s: Student) => s.id === selectedStudentId)) {
            setSelectedStudentId(data[0].id);
          }

          // 현재 주차 데이터에서 사용 가능한 항목 확인하여 selectedCategories 자동 조정
          const firstStudent = data[0];
          if (firstStudent && firstStudent.history.length > 0) {
            const currentWeekData = firstStudent.history[firstStudent.history.length - 1];
            const availableCategories: string[] = [];

            // 독해단어: 점수가 있거나 weight가 있으면 포함
            if (currentWeekData.vocab &&
              ((currentWeekData.vocab.weight && currentWeekData.vocab.weight > 0) ||
                (currentWeekData.vocab.score1 !== null && currentWeekData.vocab.score1 !== undefined) ||
                (currentWeekData.vocab.score2 !== null && currentWeekData.vocab.score2 !== undefined) ||
                (currentWeekData.vocab.score3 !== null && currentWeekData.vocab.score3 !== undefined) ||
                currentWeekData.vocab.status1 || currentWeekData.vocab.status2 || currentWeekData.vocab.status3)) {
              availableCategories.push("vocab");
            }

            // 문법이론: 제거됨 (요청에 따라 삭제)

            // 문법응용: 점수가 있거나 weight가 있으면 포함
            if (currentWeekData.grammarApp &&
              ((currentWeekData.grammarApp.weight && currentWeekData.grammarApp.weight > 0) ||
                currentWeekData.grammarApp.score !== null)) {
              availableCategories.push("grammarApp");
            }

            // 독해응용: 점수가 있으면 포함 (No weight config available)
            if (currentWeekData.readingApp && currentWeekData.readingApp.score !== null) {
              availableCategories.push("readingApp");
            }

            // 모의고사: 점수가 있거나 weight가 있으면 포함
            if (currentWeekData.mockExam &&
              ((currentWeekData.mockExam.weight && currentWeekData.mockExam.weight > 0) ||
                currentWeekData.mockExam.score !== null)) {
              availableCategories.push("mockExam");
            }

            // 사용 가능한 항목만 selectedCategories에 포함
            setSelectedCategories(prev => {
              const newCategories = prev.filter(cat => availableCategories.includes(cat));
              // 기존에 없던 항목이 새로 생겼으면 추가
              availableCategories.forEach(cat => {
                if (!newCategories.includes(cat)) {
                  newCategories.push(cat);
                }
              });
              return newCategories.length > 0 ? newCategories : availableCategories;
            });
          }
        } else {
          // Fallback to mock if fetch fails or empty
          setStudents(MOCK_STUDENTS);
          setSelectedStudentId(MOCK_STUDENTS[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch students:", error);
        setStudents(MOCK_STUDENTS);
        setSelectedStudentId(MOCK_STUDENTS[0].id);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [currentWeekId]);

  // 새로고침 함수 - 캐시 초기화 후 데이터 다시 불러오기
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // 캐시 초기화
      await fetch('/api/refresh', { method: 'POST' });
      
      // 데이터 다시 불러오기
      const res = await fetch(`/api/students?weekId=${currentWeekId}&t=${Date.now()}`, { cache: 'no-store' });
      const response = await res.json();
      const data = response.students || response;
      const settings = response.settings;
      
      if (settings) {
        setReportSettings(settings);
      }
      
      if (Array.isArray(data) && data.length > 0) {
        setStudents(data);
      }
    } catch (error) {
      console.error("Failed to refresh:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const query = searchQuery.toLowerCase().trim();
    return students.filter(s =>
      s.name.toLowerCase().includes(query) ||
      s.id.toLowerCase().includes(query) ||
      s.school?.toLowerCase().includes(query)
    );
  }, [students, searchQuery]);

  const selectedStudent = students.find(s => s.id === selectedStudentId) || students[0];

  // Ref for the print container (which will hold ALL students)
  const printRef = useRef<HTMLDivElement>(null);
  // Ref for the image download (only the report card, with all sections expanded)
  const imageRef = useRef<HTMLDivElement>(null);
  // Refs for batch image download (one per student)
  const batchImageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Weekly_Report_Batch_${new Date().toISOString().slice(0, 10)}`,
    // @ts-ignore - onBeforeGetContent는 react-to-print의 실제 기능이지만 타입 정의에 없음
    onBeforeGetContent: () => {
      // 차트가 완전히 렌더링될 때까지 대기
      return new Promise<void>((resolve) => {
        if (!printRef.current) {
          resolve();
          return;
        }

        const checkChartsReady = () => {
          const svgs = printRef.current?.querySelectorAll('svg');
          if (svgs && svgs.length > 0) {
            // 모든 SVG가 너비와 높이를 가지고 있는지 확인
            const allReady = Array.from(svgs).every(svg => {
              const rect = svg.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0;
            });
            if (allReady) {
              resolve();
              return;
            }
          }
          setTimeout(checkChartsReady, 100);
        };

        // 초기 대기 후 확인 시작
        setTimeout(checkChartsReady, 300);

        // 최대 5초 대기 후 강제로 진행
        setTimeout(() => {
          resolve();
        }, 5000);
      });
    },
    onAfterPrint: () => {
      // PDF 생성 후 렌더링 정리
      setIsPdfDownloading(false);
      setShouldRenderPrintView(false);
    },
  });

  const handlePdfDownload = async () => {
    if (students.length === 0) return;

    setIsPdfDownloading(true);

    // Print view 렌더링 시작
    setShouldRenderPrintView(true);

    // 컴포넌트 렌더링 대기
    await new Promise(resolve => setTimeout(resolve, 500));

    // PDF 생성 시작
    try {
      await handlePrint();
    } catch (error) {
      console.error('PDF 생성 실패:', error);
      alert('PDF 생성에 실패했습니다. 다시 시도해주세요.');
      setIsPdfDownloading(false);
      setShouldRenderPrintView(false);
    }
  };

  const handleCommentExport = async () => {
    if (students.length === 0) return;

    try {
      // Excel 데이터 준비
      const excelData = students.map(student => {
        const latestHistory = student.history[student.history.length - 1];
        return {
          '이름': student.name,
          'ID': student.id,
          '반': student.class,
          '학교': student.school || '',
          '주차': latestHistory?.date || '',
          '종합점수': latestHistory?.totalScore || 0,
          '코멘트': latestHistory?.comment || latestHistory?.comments?.join('\n\n') || ''
        };
      });

      // 워크북 생성
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '코멘트');

      // 컬럼 너비 설정
      const colWidths = [
        { wch: 10 }, // 이름
        { wch: 15 }, // ID
        { wch: 5 },  // 반
        { wch: 15 }, // 학교
        { wch: 15 }, // 주차
        { wch: 10 }, // 종합점수
        { wch: 80 }  // 코멘트
      ];
      worksheet['!cols'] = colWidths;

      // Excel 파일 생성
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      // File System Access API로 저장 경로 선택
      try {
        // @ts-ignore - File System Access API
        if ('showSaveFilePicker' in window) {
          // @ts-ignore
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: `학생_코멘트_${new Date().toISOString().slice(0, 10)}.xlsx`,
            types: [{
              description: 'Excel 파일',
              accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
            }],
          });

          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          alert(`전체 ${students.length}명의 코멘트가 Excel로 내보내졌습니다.`);
          return;
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.log('File System Access API 사용 불가, 일반 다운로드로 진행');
        } else {
          return; // 사용자가 취소함
        }
      }

      // 일반 다운로드
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `학생_코멘트_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);

      alert(`전체 ${students.length}명의 코멘트가 Excel로 내보내졌습니다.`);
    } catch (error) {
      console.error('Excel 내보내기 실패:', error);
      alert('Excel 내보내기에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleCommentImport = async () => {
    try {
      // 파일 선택
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.xlsx,.xls';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        try {
          const fileBuffer = await file.arrayBuffer();
          const workbook = XLSX.read(fileBuffer, { type: 'array' });

          // 시트 찾기 (코멘트 시트 또는 첫 번째 시트)
          const sheetName = workbook.SheetNames.find(name => name.includes('코멘트')) || workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(worksheet) as any[];

          if (data.length === 0) {
            alert('Excel 파일에 데이터가 없습니다.');
            return;
          }

          // 학생 데이터와 매칭하여 코멘트 업데이트
          const updatedStudents = students.map(student => {
            // 이름 또는 ID로 매칭
            const row = data.find(row =>
              row['이름']?.toString().trim() === student.name ||
              row['ID']?.toString().trim() === student.id
            );

            if (row && row['코멘트']) {
              const comment = row['코멘트']?.toString().trim() || '';
              if (comment) {
                const latestHistory = student.history[student.history.length - 1];
                if (latestHistory) {
                  return {
                    ...student,
                    history: student.history.map((h, idx) =>
                      idx === student.history.length - 1
                        ? { ...h, comment: comment, comments: [comment] }
                        : h
                    )
                  };
                }
              }
            }
            return student;
          });

          // 업데이트된 학생 수 확인
          const updatedCount = updatedStudents.filter((s, idx) => {
            const original = students[idx];
            const originalComment = original.history[original.history.length - 1]?.comment || '';
            const newComment = s.history[s.history.length - 1]?.comment || '';
            return originalComment !== newComment;
          }).length;

          if (updatedCount === 0) {
            alert('업데이트된 코멘트가 없습니다. Excel 파일의 이름 또는 ID가 일치하는지 확인해주세요.');
            return;
          }

          // 상태 업데이트
          setStudents(updatedStudents);
          alert(`총 ${updatedCount}명의 코멘트가 업데이트되었습니다.`);
        } catch (error) {
          console.error('Excel 파일 읽기 실패:', error);
          alert('Excel 파일을 읽는 중 오류가 발생했습니다. 파일 형식을 확인해주세요.');
        }
      };
      input.click();
    } catch (error) {
      console.error('파일 선택 실패:', error);
      alert('파일 선택에 실패했습니다.');
    }
  };

  const handleRefineComment = async (student: Student, skipStateUpdate = false) => {
    const latestHistory = student.history[student.history.length - 1];
    if (!latestHistory) {
      throw new Error('성적 데이터가 없습니다.');
    }
    // Note: Removed the check for existing comment to allow generation from scratch
    const calculatePercentage = (score: number | null | undefined, max: number | undefined) => {
      if (score === null || score === undefined) return null;
      if (!max || max === 0) return 0;
      return Math.round((score / max) * 100);
    };

    const calculateSumPercentage = (
      scores: (number | null | undefined)[],
      maxes: (number | undefined)[]
    ) => {
      let totalScore = 0;
      let totalMax = 0;
      let hasScore = false;

      scores.forEach((s, i) => {
        const max = maxes[i];
        if (max && max > 0) {
          totalMax += max;
          if (s !== null && s !== undefined) {
            totalScore += s;
            hasScore = true;
          }
        }
      });

      if (!hasScore || totalMax === 0) return null;
      return Math.round((totalScore / totalMax) * 100);
    };

    const vocabScore = calculateSumPercentage(
      [latestHistory.vocab?.score1, latestHistory.vocab?.score2, latestHistory.vocab?.score3, latestHistory.vocab?.score4, latestHistory.vocab?.score5],
      [latestHistory.vocab?.max1, latestHistory.vocab?.max2, latestHistory.vocab?.max3, latestHistory.vocab?.max4, latestHistory.vocab?.max5]
    );

    const homeworkScore = calculateSumPercentage(
      [latestHistory.homework?.score1, latestHistory.homework?.score2],
      [latestHistory.homework?.max1, latestHistory.homework?.max2]
    );

    // Legacy grammarApp score might be pre-calculated or needs component sum if max scores differ
    // Assuming simple sum for now if individual MAX scores are not 100 each but parts of a whole? 
    // Actually week_config says item1: 100, item2: 100. So it's average? 
    // NO, usually it's sum. Let's check report card UI.
    // ReportCardUI sums scores. And sums Max scores. 
    // So percentage is valid.

    // Note: grammarApp score in data might be reduction. 
    // Let's safe-calc from components if possible, or use .score if trusted.
    // latestHistory.grammarApp.score is calculated in excel_loader.
    // Let's use components for consistency if available, defaulting to score.
    const grammarAppScore = calculateSumPercentage(
      [latestHistory.grammarApp?.score1, latestHistory.grammarApp?.score2, latestHistory.grammarApp?.score3, latestHistory.grammarApp?.score4],
      [latestHistory.grammarApp?.max1, latestHistory.grammarApp?.max2, latestHistory.grammarApp?.max3, latestHistory.grammarApp?.max4]
    ) ?? calculatePercentage(latestHistory.grammarApp?.score, latestHistory.grammarApp?.maxScore);

    const studentJson = {
      "독해": latestHistory.readingApp?.score ?? null,
      "단어": vocabScore,
      "문법": latestHistory.grammarTheory?.score ?? null, // Hidden but asked for
      "응용": grammarAppScore,
      "모의고사": latestHistory.mockExam?.score ?? null,
      "숙제": homeworkScore
    };

    const response = await fetch('/api/comments/refine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentData: {
          name: student.name,
          class: student.class
        }, // Minimal info for identification if needed
        studentScores: studentJson
      }),
    });

    // HTTP 에러 상태 확인
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      const errorMessage = errorData.error || `HTTP ${response.status} 오류`;
      throw new Error(errorMessage);
    }

    const data = await response.json();

    if (data.success) {
      // 학생 데이터 업데이트
      if (!skipStateUpdate) {
        const updatedStudents = students.map(s =>
          s.id === student.id
            ? {
              ...s,
              history: s.history.map((h, idx) =>
                idx === s.history.length - 1
                  ? { ...h, comment: data.refinedComment }
                  : h
              )
            }
            : s
        );
        setStudents(updatedStudents);

        // 선택된 학생이면 즉시 반영
        if (selectedStudentId === student.id) {
          setSelectedStudentId(student.id); // 강제 리렌더링
        }
      }

      return { success: true, studentId: student.id, refinedComment: data.refinedComment };
    } else {
      throw new Error(data.error || '코멘트 교정에 실패했습니다.');
    }
  };

  const handleRefineCurrentComment = async () => {
    if (!selectedStudent || isRefining) return;

    setIsRefining(true);
    try {
      // 개별 교정은 상태 업데이트 필요 (skipStateUpdate = false)
      const result = await handleRefineComment(selectedStudent, false);
      if (result.success) {
        alert('코멘트가 다듬어졌습니다!');
      } else {
        // result에 error 속성이 없을 수 있으므로 안전하게 처리
        const errorMsg = (result as any).error || '코멘트 교정에 실패했습니다.';
        alert(errorMsg);
      }
    } catch (error: any) {
      alert(error.message || '코멘트 교정에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsRefining(false);
    }
  };

  const handleBatchRefineComments = async () => {
    if (isRefining || students.length === 0) return;

    setIsRefining(true);
    setRefiningProgress({ current: 0, total: students.length });
    setRefiningStartTime(Date.now());
    setCurrentProcessingStudent('');

    try {
      // 코멘트가 있는 학생만 필터링
      const studentsWithComments = students.filter(s => {
        const latestHistory = s.history[s.history.length - 1];
        return latestHistory?.comment;
      });

      if (studentsWithComments.length === 0) {
        alert('교정할 코멘트가 없습니다.');
        setIsRefining(false);
        setRefiningProgress({ current: 0, total: 0 });
        setRefiningStartTime(null);
        return;
      }

      setRefiningProgress({ current: 0, total: studentsWithComments.length });

      // 배치 처리: 동시 처리 수 증가로 속도 개선 (API 부하 고려)
      const BATCH_SIZE = 8; // 3 → 8로 증가 (약 2.7배 속도 향상)
      const BATCH_DELAY = 500; // 배치 간 딜레이 2초 → 0.5초로 단축
      const MAX_RETRIES = 3; // 최대 재시도 횟수

      let successCount = 0;
      let failCount = 0;
      const updatedStudentsMap = new Map<string, string>();

      // 재시도 로직이 포함된 요청 함수
      const refineWithRetry = async (student: Student, retries = 0): Promise<any> => {
        try {
          const result = await handleRefineComment(student, true);
          return result;
        } catch (error: any) {
          const errorMessage = error.message || error.toString() || '';
          const isRetryableError =
            errorMessage.includes('503') ||
            errorMessage.includes('overloaded') ||
            errorMessage.includes('rate limit') ||
            errorMessage.includes('Service Unavailable') ||
            errorMessage.includes('429') ||
            errorMessage.includes('HTTP 503') ||
            errorMessage.includes('404') ||
            errorMessage.includes('Not Found');

          // 재시도 가능한 오류이고 재시도 횟수가 남아있으면 재시도
          if (isRetryableError && retries < MAX_RETRIES) {
            // 재시도 지연 시간 단축: 3초 → 1.5초 (속도 개선)
            const delay = Math.min((retries + 1) * 1500, 5000); // 최대 5초까지 증가 (기존 10초에서 단축)
            console.log(`${student.name} 재시도 중... (${retries + 1}/${MAX_RETRIES}, ${delay}ms 대기)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return refineWithRetry(student, retries + 1);
          }
          // 재시도 불가능하거나 최대 재시도 횟수 초과
          console.error(`${student.name} 코멘트 교정 최종 실패:`, errorMessage);
          return { success: false, studentId: student.id, error: errorMessage };
        }
      };

      // 배치 단위로 처리
      for (let i = 0; i < studentsWithComments.length; i += BATCH_SIZE) {
        const batch = studentsWithComments.slice(i, i + BATCH_SIZE);

        // 현재 배치를 병렬로 처리
        const batchPromises = batch.map(student => {
          setCurrentProcessingStudent(student.name);
          return refineWithRetry(student).then(result => {
            setRefiningProgress(prev => ({
              current: prev.current + 1,
              total: studentsWithComments.length
            }));
            return result;
          }).catch(error => {
            setRefiningProgress(prev => ({
              current: prev.current + 1,
              total: studentsWithComments.length
            }));
            return { success: false, studentId: student.id, error: error.message };
          });
        });

        const batchResults = await Promise.allSettled(batchPromises);

        // 배치 결과 수집 (업데이트는 나중에 한 번에)
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled' && result.value && result.value.success) {
            successCount++;
            updatedStudentsMap.set(result.value.studentId, result.value.refinedComment);
            console.log(`✅ ${result.value.studentId} 코멘트 교정 성공`);
          } else {
            failCount++;
            const studentId = result.status === 'fulfilled' && result.value ? result.value.studentId : batch[batchResults.indexOf(result)]?.id;
            const errorMsg = result.status === 'fulfilled' && result.value ? result.value.error : '알 수 없는 오류';
            console.error(`❌ 학생 ID ${studentId} 코멘트 교정 실패:`, errorMsg);
          }
        });

        // 마지막 배치가 아니면 딜레이
        if (i + BATCH_SIZE < studentsWithComments.length) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        }
      }

      // 모든 배치 처리 완료 후 한 번에 업데이트
      console.log(`총 ${updatedStudentsMap.size}명의 코멘트 업데이트 예정`);
      if (updatedStudentsMap.size > 0) {
        setStudents(prevStudents => {
          const updated = prevStudents.map(s => {
            const refinedComment = updatedStudentsMap.get(s.id);
            if (refinedComment) {
              return {
                ...s,
                history: s.history.map((h, idx) =>
                  idx === s.history.length - 1
                    ? { ...h, comment: refinedComment }
                    : h
                )
              };
            }
            return s;
          });
          console.log(`업데이트된 학생 수: ${updated.filter(s => updatedStudentsMap.has(s.id)).length}`);
          return updated;
        });
      }

      alert(`전체 ${studentsWithComments.length}명 중 ${successCount}명의 코멘트 교정이 완료되었습니다.${failCount > 0 ? ` (${failCount}명 실패)` : ''}`);
    } catch (error) {
      console.error('일괄 교정 실패:', error);
      alert('일괄 교정 중 오류가 발생했습니다.');
    } finally {
      setIsRefining(false);
      setRefiningProgress({ current: 0, total: 0 });
      setRefiningStartTime(null);
      setCurrentProcessingStudent('');
    }
  };

  // 예상 시간 계산
  const getEstimatedTime = () => {
    if (!refiningStartTime || refiningProgress.current === 0 || refiningProgress.total === 0) {
      return null;
    }

    const elapsed = (Date.now() - refiningStartTime) / 1000; // 초 단위
    const avgTimePerStudent = elapsed / refiningProgress.current;
    const remaining = refiningProgress.total - refiningProgress.current;
    const estimatedSeconds = Math.ceil(avgTimePerStudent * remaining);

    if (estimatedSeconds < 60) {
      return `약 ${estimatedSeconds}초`;
    } else {
      const minutes = Math.floor(estimatedSeconds / 60);
      const seconds = estimatedSeconds % 60;
      return `약 ${minutes}분 ${seconds}초`;
    }
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleImageDownload = async () => {
    if (!imageRef.current || !selectedStudent) return;

    setIsImageDownloading(true);
    try {
      // 차트가 완전히 렌더링될 때까지 대기
      await new Promise<void>((resolve) => {
        const checkChartsReady = () => {
          const svgs = imageRef.current?.querySelectorAll('svg');
          if (svgs && svgs.length > 0) {
            const allReady = Array.from(svgs).every(svg => {
              const rect = svg.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0;
            });
            if (allReady) {
              resolve();
              return;
            }
          }
          setTimeout(checkChartsReady, 100);
        };
        setTimeout(checkChartsReady, 300);
        setTimeout(() => resolve(), 2000);
      });

      // 이미지 생성
      const dataUrl = await toPng(imageRef.current, {
        quality: 1.0,
        pixelRatio: 2, // 고해상도
        backgroundColor: '#ffffff',
        cacheBust: true,
        style: {
          transform: 'scale(1)',
        },
      });

      // File System Access API로 저장 경로 선택 (지원하는 경우)
      try {
        // @ts-ignore - File System Access API
        if ('showSaveFilePicker' in window) {
          // @ts-ignore
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: `${selectedStudent.name}_성적표_${new Date().toISOString().slice(0, 10)}.png`,
            types: [{
              description: 'PNG 이미지',
              accept: { 'image/png': ['.png'] },
            }],
          });

          const blob = await (await fetch(dataUrl)).blob();
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          return;
        }
      } catch (err: any) {
        // 사용자가 취소한 경우 또는 지원하지 않는 브라우저
        if (err.name !== 'AbortError') {
          console.log('File System Access API 사용 불가, 일반 다운로드로 진행');
        } else {
          return; // 사용자가 취소함
        }
      }

      // 일반 다운로드 (File System Access API 미지원 또는 취소)
      const link = document.createElement('a');
      link.download = `${selectedStudent.name}_성적표_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('이미지 생성 실패:', error);
      alert('이미지 생성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsImageDownloading(false);
    }
  };

  const handleBatchImageDownload = async () => {
    if (students.length === 0) return;

    setIsBatchDownloading(true);
    setDownloadProgress({ current: 0, total: students.length });

    // Render batch view only when needed
    setShouldRenderBatchView(true);

    // Wait for components to render
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const zip = new JSZip();
      const dateStr = new Date().toISOString().slice(0, 10);

      // 각 학생의 이미지 생성
      for (let i = 0; i < students.length; i++) {
        const student = students[i];
        const studentRef = batchImageRefs.current.get(student.id);

        if (!studentRef) {
          console.warn(`학생 ${student.name}의 참조를 찾을 수 없습니다.`);
          continue;
        }

        setDownloadProgress({ current: i + 1, total: students.length });

        // 차트 렌더링 대기
        await new Promise<void>((resolve) => {
          const checkChartsReady = () => {
            const svgs = studentRef.querySelectorAll('svg');
            if (svgs.length > 0) {
              const allReady = Array.from(svgs).every(svg => {
                const rect = svg.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
              });
              if (allReady) {
                resolve();
                return;
              }
            }
            setTimeout(checkChartsReady, 100);
          };
          setTimeout(checkChartsReady, 300);
          setTimeout(() => resolve(), 2000);
        });

        // 이미지 생성
        const dataUrl = await toPng(studentRef, {
          quality: 1.0,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          cacheBust: true,
        });

        // Base64를 Blob으로 변환
        const response = await fetch(dataUrl);
        const blob = await response.blob();

        // ZIP에 추가
        zip.file(`${student.name}_성적표_${dateStr}.png`, blob);
      }

      // ZIP 파일 생성
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // File System Access API로 저장 경로 선택
      try {
        // @ts-ignore - File System Access API
        if ('showSaveFilePicker' in window) {
          // @ts-ignore
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: `전체_성적표_${dateStr}.zip`,
            types: [{
              description: 'ZIP 파일',
              accept: { 'application/zip': ['.zip'] },
            }],
          });

          const writable = await fileHandle.createWritable();
          await writable.write(zipBlob);
          await writable.close();
          alert(`전체 ${students.length}명의 성적표가 다운로드되었습니다.`);
          return;
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.log('File System Access API 사용 불가, 일반 다운로드로 진행');
        } else {
          return; // 사용자가 취소함
        }
      }

      // 일반 다운로드
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `전체_성적표_${dateStr}.zip`;
      link.click();
      URL.revokeObjectURL(url);

      alert(`전체 ${students.length}명의 성적표가 다운로드되었습니다.`);
    } catch (error) {
      console.error('일괄 이미지 생성 실패:', error);
      alert('일괄 다운로드에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsBatchDownloading(false);
      setDownloadProgress({ current: 0, total: 0 });
      setShouldRenderBatchView(false); // Clean up after download
    }
  };

  // 실제 데이터가 있는 항목만 필터에 표시
  const availableCategories = useMemo(() => {
    if (!selectedStudent || !selectedStudent.history.length) return [];

    const currentWeekData = selectedStudent.history[selectedStudent.history.length - 1];
    const categories: { id: string; label: string }[] = [];

    // 독해단어: score1, score2, score3 중 하나라도 있거나 status가 있으면 포함
    if (currentWeekData.vocab &&
      ((currentWeekData.vocab.score1 !== null && currentWeekData.vocab.score1 !== undefined) ||
        (currentWeekData.vocab.score2 !== null && currentWeekData.vocab.score2 !== undefined) ||
        (currentWeekData.vocab.score3 !== null && currentWeekData.vocab.score3 !== undefined) ||
        currentWeekData.vocab.status1 || currentWeekData.vocab.status2 || currentWeekData.vocab.status3)) {
      categories.push({ id: "vocab", label: "독해단어" });
    }

    // 문법이론: 점수가 있거나 themes가 있고 길이가 0보다 크면 포함
    // 점수가 null이고 themes도 없거나 빈 배열이면 제외
    if (currentWeekData.grammarTheory &&
      (currentWeekData.grammarTheory.score !== null ||
        (currentWeekData.grammarTheory.themes && currentWeekData.grammarTheory.themes.length > 0)) &&
      !(currentWeekData.grammarTheory.score === null &&
        (!currentWeekData.grammarTheory.themes || currentWeekData.grammarTheory.themes.length === 0))) {
      categories.push({ id: "grammarTheory", label: "문법이론" });
    }

    // 문법응용: 점수가 있으면 포함
    if (currentWeekData.grammarApp && currentWeekData.grammarApp.score !== null) {
      categories.push({ id: "grammarApp", label: "문법응용" });
    }

    // 독해응용: 점수가 있으면 포함
    if (currentWeekData.readingApp && currentWeekData.readingApp.score !== null) {
      categories.push({ id: "readingApp", label: "독해응용" });
    }

    // 모의고사: 점수가 있으면 포함
    if (currentWeekData.mockExam && currentWeekData.mockExam.score !== null) {
      categories.push({ id: "mockExam", label: "모의고사" });
    }

    return categories;
  }, [selectedStudent, currentWeekId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-slate-600">데이터 불러오는 중...</span>
      </div>
    );
  }

  // Guard clause if no students found even after fallback
  if (!selectedStudent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <span className="text-slate-600">데이터가 없습니다.</span>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white py-12 px-4 print:bg-white print:p-0">

      {/* 성적표 유형 선택 헤더 */}
      <div className="max-w-[210mm] mx-auto mb-4 flex items-center justify-between print:hidden">
        <h1 className="text-xl font-bold text-slate-800">양영학원 고등 영어과 성적표</h1>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md text-sm font-medium">
            주간 성적표
          </span>
          <a
            href="/internal-exam"
            className="px-3 py-1.5 bg-white border border-slate-300 text-slate-600 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            내신기출 성적표
          </a>
          <a
            href="/error-notes"
            className="px-3 py-1.5 bg-white border border-slate-300 text-slate-600 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            오답노트
          </a>
        </div>
      </div>

      {/* Control Panel */}
      <div className="max-w-[210mm] mx-auto mb-8 bg-white p-4 rounded-lg shadow-sm print:hidden">
        {/* Left Section: Search and Student Selection */}
        <div className="flex items-center gap-3 mb-4 w-full">
          <Users className="w-5 h-5 text-slate-500 flex-shrink-0" />
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="학생 검색 (이름, ID, 학교)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredStudents.length > 0) {
                  setSelectedStudentId(filteredStudents[0].id);
                  setSearchQuery('');
                }
              }}
              className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[220px]"
          >
            {filteredStudents.length > 0 ? (
              filteredStudents.map(s => (
                <option key={s.id} value={s.id} className="text-slate-900">{s.name} ({s.id})</option>
              ))
            ) : (
              <option value="" className="text-slate-900">검색 결과 없음</option>
            )}
          </select>
          {/* 주차 선택 - 단일 주차 모드이므로 숨김 */}
        </div>

        {/* Right Section: Action Buttons - 가로 정렬 */}
        <div className="flex items-center gap-2 flex-wrap w-full">
          {/* 새로고침 버튼 */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="스프레드시트에서 최신 데이터 불러오기"
          >
            <RefreshCw className={clsx("w-4 h-4", isRefreshing && "animate-spin")} />
            {isRefreshing ? "새로고침 중..." : "새로고침"}
          </button>

          {/* 코멘트 수정 */}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              isEditing
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
            )}
          >
            {isEditing ? "저장 (Save)" : "코멘트 수정"}
          </button>

          {/* 내보내기 옵션 (필터) */}
          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              내보내기 옵션
            </button>
            {isFilterOpen && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 p-2 z-[100]">
                <div className="text-xs font-semibold text-slate-500 px-2 py-1 mb-1">포함할 영역 선택</div>
                {availableCategories.map(cat => (
                  <div
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer text-sm"
                  >
                    <div className={clsx(
                      "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                      selectedCategories.includes(cat.id)
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "border-slate-300 bg-white"
                    )}>
                      {selectedCategories.includes(cat.id) && <Check className="w-3 h-3" />}
                    </div>
                    <span className="text-slate-700">{cat.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 이미지 다운로드 드롭다운 */}
          <div className="relative">
            <button
              onClick={() => {
                setIsImageMenuOpen(!isImageMenuOpen);
                setIsAIMenuOpen(false);
              }}
              disabled={isImageDownloading || isBatchDownloading}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Image className="w-4 h-4" />
              이미지 다운로드
              <ChevronDown className="w-4 h-4" />
            </button>
            {isImageMenuOpen && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-[100]">
                <button
                  onClick={async () => {
                    setIsImageMenuOpen(false);
                    await handleImageDownload();
                  }}
                  disabled={isImageDownloading || isBatchDownloading}
                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-t-lg"
                >
                  <Image className="w-4 h-4" />
                  개별 다운로드
                </button>
                <button
                  onClick={async () => {
                    setIsImageMenuOpen(false);
                    await handleBatchImageDownload();
                  }}
                  disabled={isImageDownloading || isBatchDownloading || students.length === 0}
                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-b-lg border-t border-slate-200"
                >
                  <DownloadCloud className="w-4 h-4" />
                  전체 다운로드
                </button>
              </div>
            )}
          </div>

          {/* PDF 다운로드 */}
          <button
            onClick={handlePdfDownload}
            disabled={isImageDownloading || isBatchDownloading || isPdfDownloading}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPdfDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                PDF 다운로드
              </>
            )}
          </button>

          {/* Excel 템플릿 생성 버튼 */}
          <button
            onClick={async () => {
              const weekNum = parseInt(currentWeekId.match(/W(\d+)/)?.[1] || '1');
              try {
                const response = await fetch('/api/excel/create-template', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ weekId: currentWeekId, weekNum }),
                });

                if (!response.ok) {
                  throw new Error('템플릿 생성 실패');
                }

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${currentWeekId}.xlsx`;
                link.click();
                URL.revokeObjectURL(url);

                alert(`${currentWeekId} 주차 Excel 템플릿이 다운로드되었습니다.\n설정 시트가 포함되어 있습니다.`);
              } catch (error) {
                console.error('템플릿 생성 오류:', error);
                alert('Excel 템플릿 생성에 실패했습니다.');
              }
            }}
            className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-600 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel 템플릿 생성
          </button>

          {/* 코멘트 Excel 내보내기/불러오기 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCommentExport}
              disabled={isImageDownloading || isBatchDownloading || isPdfDownloading || students.length === 0}
              className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="w-4 h-4" />
              코멘트 Excel 내보내기
            </button>
            <button
              onClick={handleCommentImport}
              disabled={isImageDownloading || isBatchDownloading || isPdfDownloading || students.length === 0}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="w-4 h-4" />
              코멘트 Excel 불러오기
            </button>
          </div>

          {/* AI 코멘트 교정 드롭다운 */}
          <div className="relative">
            <button
              onClick={() => {
                setIsAIMenuOpen(!isAIMenuOpen);
                setIsImageMenuOpen(false);
              }}
              disabled={isRefining || isImageDownloading || isBatchDownloading || isPdfDownloading}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              AI 코멘트 교정
              <ChevronDown className="w-4 h-4" />
            </button>
            {isAIMenuOpen && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-[100]">
                <button
                  onClick={async () => {
                    setIsAIMenuOpen(false);
                    await handleRefineCurrentComment();
                  }}
                  disabled={isRefining || !selectedStudent}
                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-t-lg"
                >
                  <Sparkles className="w-4 h-4" />
                  개별 코멘트 교정
                </button>
                <button
                  onClick={async () => {
                    setIsAIMenuOpen(false);
                    await handleBatchRefineComments();
                  }}
                  disabled={isRefining || students.length === 0}
                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-b-lg border-t border-slate-200"
                >
                  <Sparkles className="w-4 h-4" />
                  전체 코멘트 교정
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 코멘트 교정 진행 상황 모달 */}
      {isRefining && refiningProgress.total > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] print:hidden">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
              <h3 className="text-lg font-semibold text-slate-800">AI 코멘트 교정 진행 중</h3>
            </div>

            {/* 진행률 바 */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-slate-600 mb-2">
                <span>진행 상황: {refiningProgress.current} / {refiningProgress.total}</span>
                <span>{Math.round((refiningProgress.current / refiningProgress.total) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-purple-600 h-full transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${(refiningProgress.current / refiningProgress.total) * 100}%` }}
                />
              </div>
            </div>

            {/* 현재 처리 중인 학생 */}
            {currentProcessingStudent && (
              <div className="mb-4 text-sm text-slate-600">
                <span className="font-medium">처리 중:</span> {currentProcessingStudent}
              </div>
            )}

            {/* 예상 시간 */}
            {getEstimatedTime() && (
              <div className="text-sm text-slate-500 mb-4">
                예상 남은 시간: {getEstimatedTime()}
              </div>
            )}

            {/* 진행 상황 상세 */}
            <div className="text-xs text-slate-400">
              {refiningProgress.current > 0 && refiningStartTime && (
                <div>
                  경과 시간: {Math.floor((Date.now() - refiningStartTime) / 1000)}초
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Interactive View (Single Student) */}
      <div className="flex justify-center print:hidden">
        <ReportCardUI
          student={selectedStudent}
          selectedCategories={selectedCategories}
          isPrint={false}
          isEditing={isEditing}
          selectedMetrics={selectedMetrics}
          onMetricsChange={setSelectedMetrics}
          showSubjectGrade={showSubjectGrade}
          onShowSubjectGradeChange={setShowSubjectGrade}
          reportSettings={reportSettings}
          onCommentChange={(comment) => {
            // Update comment in the student data
            const updatedStudents = students.map(s =>
              s.id === selectedStudent.id
                ? {
                  ...s,
                  history: s.history.map((h, idx) =>
                    idx === s.history.length - 1
                      ? { ...h, comment }
                      : h
                  )
                }
                : s
            );
            setStudents(updatedStudents);
          }}
        />
      </div>

      {/* Image Download View (Hidden, all sections expanded) */}
      <div className="fixed left-[-9999px] top-0" style={{ width: '210mm', visibility: 'hidden' }}>
        <div ref={imageRef} style={{ visibility: 'visible', width: '100%' }}>
          <ReportCardUI
            student={selectedStudent}
            selectedCategories={selectedCategories}
            isPrint={false}
            forceOpen={true}
            selectedMetrics={selectedMetrics}
            showSubjectGrade={showSubjectGrade}
            reportSettings={reportSettings}
          />
        </div>
      </div>

      {/* Batch Image Download View (Hidden, one per student, all sections expanded) - Only render when needed */}
      {shouldRenderBatchView && (
        <div className="fixed left-[-9999px] top-0" style={{ width: '210mm', visibility: 'hidden' }}>
          {students.map((student) => (
            <div
              key={student.id}
              ref={(el) => {
                if (el) {
                  batchImageRefs.current.set(student.id, el);
                } else {
                  batchImageRefs.current.delete(student.id);
                }
              }}
              style={{ visibility: 'visible', width: '100%', marginBottom: '20px' }}
            >
              <ReportCardUI
                student={student}
                selectedCategories={selectedCategories}
                isPrint={false}
                forceOpen={true}
                selectedMetrics={selectedMetrics}
                showSubjectGrade={showSubjectGrade}
                reportSettings={reportSettings}
              />
            </div>
          ))}
        </div>
      )}

      {/* Print View (All Students) - Only render when PDF download is requested */}
      {shouldRenderPrintView && (
        <div className="fixed left-[-9999px] top-0 print:static print:left-0" style={{ width: '210mm', visibility: 'hidden' }}>
          <div ref={printRef} style={{ visibility: 'visible', width: '100%' }}>
            {students.map((student) => (
              <ReportCardUI
                key={student.id}
                student={student}
                selectedCategories={selectedCategories}
                isPrint={true}
                isEditing={isEditing}
                selectedMetrics={selectedMetrics}
                showSubjectGrade={showSubjectGrade}
                reportSettings={reportSettings}
                onCommentChange={(comment) => {
                  // Update comment in the student data
                  const updatedStudents = students.map(s =>
                    s.id === student.id
                      ? {
                        ...s,
                        history: s.history.map((h, idx) =>
                          idx === s.history.length - 1
                            ? { ...h, comment }
                            : h
                        )
                      }
                      : s
                  );
                  setStudents(updatedStudents);
                }}
              />
            ))}
          </div>
        </div>
      )}

    </main>
  );
}
