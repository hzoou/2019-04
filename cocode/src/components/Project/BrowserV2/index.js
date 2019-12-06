import React, { useState, useEffect, useContext } from 'react';
import * as Styled from './style';

import * as bundler from 'bundler';

import ProjectContext from 'contexts/ProjectContext';

function BrowserV2({ ...props }) {
	const { project } = useContext(ProjectContext);
	const { files, root } = project;
	const [isChange, setIsChange] = useState(false);
	const [fileSystem, setFileSystem] = useState({});
	const [errorDescription, setErrorDescription] = useState(null);

	useEffect(() => {
		function fileParser(path, id) {
			if (files[id].type !== 'directory') {
				fileSystem[path] = {
					contents: files[id].contents
				};
				delete exports[path];
			} else if (files[id].child) {
				files[id].child.forEach(id => {
					const path = files[id].path;
					fileParser(path, id);
				});
			}
		}
		const rootPath = files[root].path;
		if (project) fileParser(rootPath, project.root);
		setIsChange(true);
	}, [files]);

	useEffect(() => {
		if (isChange) {
			setIsChange(false);
			try {
				bundler.init();
				bundler.require('./index.js');
        setErrorDescription(null);
			} catch (error) {
				setErrorDescription(error.stack);
			}
	}, [isChange]);

	return (
		<Styled.Frame>
			<Styled.ErrorDisplay errorDescription={errorDescription}>
				<pre>{errorDescription}</pre>
			</Styled.ErrorDisplay>
			<Styled.BrowserV2 {...props}></Styled.BrowserV2>
		</Styled.Frame>
	);
}

export default BrowserV2;
