'use client';

import { ErrorAlert } from './components/ErrorAlert';
import { PredictionResult } from './components/PredictionResult';
import { UploadForm } from './components/UploadForm';
import { UploadHeader } from './components/UploadHeader';
import { useUploadFlow } from './hooks/useUploadFlow';

export default function UploadPage() {
  const {
    selectedFile,
    previewUrl,
    isModelLoading,
    modelError,
    isValidatingFile,
    displayError,
    confidencePercent,
    handleFileChange,
    handleSubmit,
    resetForm,
    mutation,
  } = useUploadFlow();

  const isInteractionDisabled =
    mutation.isPending || isValidatingFile || isModelLoading || Boolean(modelError);

  const showResetButton =
    Boolean(selectedFile) || mutation.isSuccess || Boolean(displayError);

  const shouldRenderPrediction =
    mutation.isSuccess && !displayError && Boolean(mutation.data) && Boolean(confidencePercent);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center px-4 py-16">
      <div className="w-full space-y-10">
        <UploadHeader />

        <UploadForm
          onSubmit={handleSubmit}
          onFileChange={handleFileChange}
          onReset={resetForm}
          previewUrl={previewUrl}
          isFileInputDisabled={isInteractionDisabled}
          isModelLoading={isModelLoading}
          isValidatingFile={isValidatingFile}
          isSubmitDisabled={isInteractionDisabled}
          isMutating={mutation.isPending}
          showResetButton={showResetButton}
        />

        {displayError && <ErrorAlert message={displayError} />}

        {shouldRenderPrediction && mutation.data && confidencePercent && (
          <PredictionResult shape={mutation.data.shape} confidencePercent={confidencePercent} />
        )}
      </div>
    </main>
  );
}
