"use client";

import {
	Children,
	type ComponentProps,
	cloneElement,
	type HTMLAttributes,
	isValidElement,
	type ReactNode,
	type RefObject,
	useId,
} from "react";
import { cn } from "../../lib/utils";
import { Field, FieldDescription, FieldGroup } from "./field";
import { FormError } from "./form-error";
import { Input } from "./input";
import { Label } from "./label";
import { Textarea } from "./textarea";

interface FormFieldProps extends HTMLAttributes<HTMLDivElement> {
	children?: ReactNode;
	description?: string | undefined;
	error?: string | undefined;
	fieldId?: string | undefined;
	label?: string | undefined;
	required?: boolean | undefined;
}

const FormField = ({
	className,
	label,
	description,
	error,
	required = false,
	children,
	fieldId,
	ref,
	...props
}: FormFieldProps & { ref?: RefObject<HTMLDivElement | null> }) => {
	const generatedId = useId();
	const id = fieldId || generatedId;
	const descriptionId = description ? `${id}-description` : undefined;
	const errorId = error ? `${id}-error` : undefined;

	return (
		<Field className={cn("space-y-2", className)} ref={ref} {...props}>
			{label === null || label === undefined ? null : (
				<Label
					className={
						required
							? "after:ml-0.5 after:text-destructive-subtle-foreground after:content-['*']"
							: undefined
					}
					htmlFor={id}
				>
					{label}
				</Label>
			)}

			<FieldGroup>
				{children
					? Children.map(children, (child) => {
							if (isValidElement<Record<string, unknown>>(child)) {
								return cloneElement(child, {
									id,
									"aria-describedby":
										[descriptionId, errorId].filter(Boolean).join(" ") ||
										undefined,
									"aria-invalid": error ? true : undefined,
								});
							}
							return child;
						})
					: null}
			</FieldGroup>

			{description === null || description === undefined ? null : (
				<FieldDescription id={descriptionId}>{description}</FieldDescription>
			)}

			{error === null || error === undefined ? null : (
				<FormError id={errorId} message={error} />
			)}
		</Field>
	);
};
FormField.displayName = "FormField";

// Convenience exports for common form controls
const FormInput = ({
	ref,
	...props
}: ComponentProps<typeof Input> & {
	ref?: RefObject<HTMLInputElement | null>;
}) => <Input ref={ref} {...props} />;
FormInput.displayName = "FormInput";

const FormTextarea = ({
	ref,
	...props
}: ComponentProps<typeof Textarea> & {
	ref?: RefObject<HTMLTextAreaElement | null>;
}) => <Textarea ref={ref} {...props} />;
FormTextarea.displayName = "FormTextarea";

export { FormField, FormInput, FormTextarea };
