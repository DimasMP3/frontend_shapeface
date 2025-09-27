"use client";

import { CameraHeader } from "./components/CameraHeader";
import { CameraViewport } from "./components/CameraViewport";
import { CaptureSidebar } from "./components/CaptureSidebar";
import { PredictionSummary } from "./components/PredictionSummary";
import { useCameraFlow } from "./hooks/useCameraFlow";

export default function CameraPage() {
  const {
    webcamRef,
    canvasRef,
    handleVideoPlay,
    handleCapture,
    resetProcess,
    step,
    stepContent,
    orientationLabels,
    captures,
    captureButtonLabel,
    isCaptureReady,
    liveStatusClass,
    liveStatusText,
    nextOrientation,
    displayError,
    metrics,
    showMetrics,
    isMutating,
    isMutationSuccess,
    isModelLoading,
    modelError,
    videoConstraints,
    shouldShowPrediction,
    predictionShape,
    confidencePercent,
  } = useCameraFlow();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center px-4 py-16">
      <div className="w-full space-y-10">
        <CameraHeader />

        <section className="grid gap-8 lg:grid-cols-[1.2fr_minmax(260px,1fr)]">
          <CaptureSidebar
            step={step}
            stepContent={stepContent}
            orientationLabels={orientationLabels}
            captures={captures}
            onCapture={handleCapture}
            onReset={resetProcess}
            isCaptureReady={isCaptureReady}
            isMutating={isMutating}
            isMutationSuccess={isMutationSuccess}
            captureButtonLabel={captureButtonLabel}
            liveStatusClass={liveStatusClass}
            liveStatusText={liveStatusText}
            nextOrientation={nextOrientation}
            displayError={displayError}
          />

          <div className="space-y-3">
            <CameraViewport
              webcamRef={webcamRef}
              canvasRef={canvasRef}
              onVideoPlay={handleVideoPlay}
              metrics={metrics}
              showMetrics={showMetrics}
              liveStatusClass={liveStatusClass}
              liveStatusText={liveStatusText}
              isCaptureReady={isCaptureReady}
              step={step}
              orientationLabels={orientationLabels}
              videoConstraints={videoConstraints}
            />

            {(isModelLoading || modelError) && (
              <div className="space-y-1 text-center text-xs">
                {isModelLoading && <p className="text-slate-400">Memuat model deteksi wajah...</p>}
                {modelError && <p className="text-rose-400">{modelError}</p>}
              </div>
            )}
          </div>
        </section>

        {shouldShowPrediction && (
          <PredictionSummary shape={predictionShape} confidencePercent={confidencePercent} />
        )}
      </div>
    </main>
  );
}