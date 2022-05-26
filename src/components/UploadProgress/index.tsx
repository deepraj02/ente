import { UploadProgressDialog } from './dialog';
import { MinimizedUploadProgress } from './minimized';
import React, { useContext, useState } from 'react';

import constants from 'utils/strings/constants';
import { FileUploadResults, UPLOAD_STAGES } from 'constants/upload';
import { AppContext } from 'pages/_app';

interface Props {
    fileCounter;
    uploadStage;
    now;
    closeModal;
    retryFailed;
    fileProgress: Map<number, number>;
    filenames: Map<number, string>;
    show;
    uploadResult: Map<number, FileUploadResults>;
    hasLivePhotos: boolean;
    cancelUploads: () => void;
}
export interface FileProgresses {
    fileID: number;
    progress: number;
}

export default function UploadProgress(props: Props) {
    const appContext = useContext(AppContext);
    const [expanded, setExpanded] = useState(true);
    const fileProgressStatuses = [] as FileProgresses[];
    const fileUploadResultMap = new Map<FileUploadResults, number[]>();
    let filesNotUploaded = false;
    let sectionInfo = null;
    if (props.fileProgress) {
        for (const [localID, progress] of props.fileProgress) {
            fileProgressStatuses.push({
                fileID: localID,
                progress,
            });
        }
    }
    if (props.uploadResult) {
        for (const [localID, progress] of props.uploadResult) {
            if (!fileUploadResultMap.has(progress)) {
                fileUploadResultMap.set(progress, []);
            }
            if (progress !== FileUploadResults.UPLOADED) {
                filesNotUploaded = true;
            }
            const fileList = fileUploadResultMap.get(progress);

            fileUploadResultMap.set(progress, [...fileList, localID]);
        }
    }
    if (props.hasLivePhotos) {
        sectionInfo = constants.LIVE_PHOTOS_DETECTED;
    }

    function handleHideModal() {
        if (props.uploadStage !== UPLOAD_STAGES.FINISH) {
            appContext.setDialogMessage({
                title: constants.STOP_UPLOADS_HEADER,
                content: constants.STOP_ALL_UPLOADS_MESSAGE,
                proceed: {
                    text: constants.YES_STOP_UPLOADS,
                    variant: 'danger',
                    action: props.cancelUploads,
                },
                close: {
                    text: constants.NO,
                    variant: 'secondary',
                    action: () => {},
                },
            });
        } else {
            props.closeModal();
        }
    }
    return (
        <>
            {expanded ? (
                <UploadProgressDialog
                    handleHideModal={handleHideModal}
                    setExpanded={setExpanded}
                    expanded={expanded}
                    fileProgressStatuses={fileProgressStatuses}
                    sectionInfo={sectionInfo}
                    fileUploadResultMap={fileUploadResultMap}
                    filesNotUploaded={filesNotUploaded}
                    {...props}
                />
            ) : (
                <MinimizedUploadProgress
                    setExpanded={setExpanded}
                    expanded={expanded}
                    handleHideModal={handleHideModal}
                    {...props}
                />
            )}
        </>
    );
}
