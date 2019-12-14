import React, {
	useState,
	useEffect,
	useContext,
	useRef,
	useCallback
} from 'react';
import { useParams } from 'react-router-dom';
import * as Styled from './style';

import CoconutSpinner from 'components/Common/CoconutSpinner';

import ProjectContext from 'contexts/ProjectContext';

import { installDependencyActionCreator } from 'actions/Project';

import { updateFileAPICreator } from 'apis/File';

import useFetch from 'hooks/useFetch';

import getUpdatedPackageJSON from 'pages/Project/getUpdatedPackageJSON';

// Constants
const MIN_WAIT_TIME = 1500;
const UPDATE_CODE = 'updateFile';
const CREATE_NEW_PROJECT = 'createNewProject';

function BrowserV2({ ...props }) {
	const { projectId } = useParams();

	const { project, dispatchProject } = useContext(ProjectContext);
	const [{ data, error }, setRequest] = useFetch({});
	const [isReadyToReceiveMessage, setIsReadyToReceiveMessage] = useState(
		false
	);
	const [dependency, setDependency] = useState(undefined);
	const [isBuildingCoconut, setIsBuildingCoconut] = useState(true);
	const iframeReference = useRef();

	const { files, root, dependencyInstalling } = project;

	const handleComponentDidMount = () => {
		window.addEventListener('message', receiveMsgFromChild);
	};

	const receiveMsgFromChild = e => {
		const { command, dependency } = e.data;

		const cocodeActions = { buildEnd };
		cocodeActions[command] && cocodeActions[command](dependency);
	};

	const buildEnd = () => setIsBuildingCoconut(false);

	const endInstallDependency = useCallback(dependency => {
		setTimeout(() => {
			const installDependencyAction = installDependencyActionCreator({
				moduleName: dependency.name,
				moduleVersion: dependency.version
			});
			dispatchProject(installDependencyAction);
		}, MIN_WAIT_TIME);
	});

	const handleUpdateDependency = () => {
		if (!isReadyToReceiveMessage) return;
		if (!dependencyInstalling) return;

		const dependency = dependencyInstalling;
		setDependency(dependency);

		if (projectId === 'new') {
			endInstallDependency(dependency);
			return;
		}

		const {
			newPackageJSONContents,
			packageJSONFileId
		} = getUpdatedPackageJSON(files, root, dependency);

		const updateFileAPI = updateFileAPICreator(
			projectId,
			packageJSONFileId,
			{
				contents: newPackageJSONContents
			}
		);
		setRequest(updateFileAPI);
	};

	const handleUpdateFile = () => {
		if (!isReadyToReceiveMessage) return;

		const data = {
			command: UPDATE_CODE,
			project
		};

		iframeReference.current.contentWindow.postMessage(data, '*');
	};

	const handleSuccessResponse = () => {
		if (!data) return;

		endInstallDependency(dependency);
	};

	const handleErrorResponse = () => {
		if (!error) return;
		console.log('error: update package json');
	};

	const handleIframeOnLoad = useCallback(() => {
		setIsReadyToReceiveMessage(true);

		if (projectId === 'new') {
			const data = {
				command: CREATE_NEW_PROJECT,
				project
			};

			iframeReference.current.contentWindow.postMessage(data, '*');
		}
	}, [project]);

	useEffect(handleComponentDidMount, []);
	useEffect(handleUpdateDependency, [dependencyInstalling]);
	useEffect(handleUpdateFile, [files]);

	useEffect(handleSuccessResponse, [data]);
	useEffect(handleErrorResponse, [error]);

	return (
		<Styled.Frame>
			{isBuildingCoconut && (
				<Styled.LoadingOverlay>
					<CoconutSpinner />
					<p>Please wait to build complete...</p>
				</Styled.LoadingOverlay>
			)}
			<Styled.BrowserV2
				ref={iframeReference}
				src={`/coconut/${projectId}`}
				onLoad={handleIframeOnLoad}
				{...props}
			></Styled.BrowserV2>
		</Styled.Frame>
	);
}

export default BrowserV2;
