/**
 * MDX registry SSOT: docs-V2/docs/ui-components.md — local CLI components
 * AutoTypeTable / TypeTable: docs-V2/docs/typescript.md
 */
import { AutoTypeTable } from "fumadocs-typescript/ui";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import type { ComponentProps } from "react";
import { Accordion, Accordions } from "@/components/accordion";
import { APIPage } from "@/components/api-page";
import { Callout } from "@/components/callout";
import { Card, Cards } from "@/components/card";
import { CodeBlock, Pre } from "@/components/codeblock";
import { DocsGraphView } from "@/components/docs-graph-view";
import { File, Files, Folder } from "@/components/files";
import { Heading } from "@/components/heading";
import { ImageZoom } from "@/components/image-zoom";
import { InlineTOC } from "@/components/inline-toc";
import { Step, Steps } from "@/components/steps";
import { Tab, Tabs } from "@/components/tabs";
import { TypeTable } from "@/components/type-table";
import { docsTypeGenerator } from "@/lib/docs-typescript";

function MdxZoomImage(props: ComponentProps<"img">) {
	const { src, alt, ...rest } = props;
	if (typeof src !== "string") {
		return <img alt={alt ?? ""} src={src} {...rest} />;
	}
	return <ImageZoom src={src} alt={alt ?? ""} {...rest} />;
}

export function getMDXComponents(components?: MDXComponents): MDXComponents {
	return {
		...defaultMdxComponents,
		h1: (props) => <Heading as="h1" {...props} />,
		h2: (props) => <Heading as="h2" {...props} />,
		h3: (props) => <Heading as="h3" {...props} />,
		h4: (props) => <Heading as="h4" {...props} />,
		h5: (props) => <Heading as="h5" {...props} />,
		h6: (props) => <Heading as="h6" {...props} />,
		Callout,
		Card,
		Cards,
		Accordion,
		Accordions,
		AutoTypeTable: (props) => (
			<AutoTypeTable {...props} generator={docsTypeGenerator} />
		),
		CodeBlock,
		DynamicCodeBlock,
		File,
		Files,
		Folder,
		GraphView: DocsGraphView,
		ImageZoom,
		InlineTOC,
		Step,
		Steps,
		Tab,
		Tabs,
		TypeTable,
		APIPage,
		OpenAPIPage: APIPage,
		img: MdxZoomImage,
		pre: (props: ComponentProps<"pre">) => {
			const { ref: _ref, ...rest } = props;
			return (
				<CodeBlock {...rest}>
					<Pre>{rest.children}</Pre>
				</CodeBlock>
			);
		},
		...components,
	};
}

export const useMDXComponents = getMDXComponents;
