"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import { Field, FieldDescription, FieldGroup } from "./field";
import { FormError } from "./form-error";
import { Input } from "./input";
import { Label } from "./label";
import { Textarea } from "./textarea";

interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
	label?: string;
	description?: string;
	error?: string;
	required?: boolean;
	children?: React.ReactNode;
	fieldId?: string;
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
	(
		{
			className,
			label,
			description,
			error,
			required = false,
			children,
			fieldId,
			...props
		},
		ref,
	) => {
		const generatedId = React.useId();
		const id = fieldId || generatedId;
		const descriptionId = description ? `${id}-description` : undefined;
		const errorId = error ? `${id}-error` : undefined;

		return (
			<Field ref={ref} className={cn("space-y-2", className)} {...props}>
				{label && (
					<Label
						htmlFor={id}
						className={
							required
								? "after:content-['*'] after:ml-0.5 after:text-destructive"
								: undefined
						}
					>
						{label}
					</Label>
				)}

				<FieldGroup>
					{children
						? React.Children.map(children, (child) => {
								if (React.isValidElement<Record<string, unknown>>(child)) {
									return React.cloneElement(child, {
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

				{description && (
					<FieldDescription id={descriptionId}>{description}</FieldDescription>
				)}

				{error && <FormError message={error} id={errorId} />}
			</Field>
		);
	},
);
FormField.displayName = "FormField";

// Convenience exports for common form controls
const FormInput = React.forwardRef<
	HTMLInputElement,
	React.ComponentProps<typeof Input>
>((props, ref) => <Input ref={ref} {...props} />);
FormInput.displayName = "FormInput";

const FormTextarea = React.forwardRef<
	HTMLTextAreaElement,
	React.ComponentProps<typeof Textarea>
>((props, ref) => <Textarea ref={ref} {...props} />);
FormTextarea.displayName = "FormTextarea";

export { FormField, FormInput, FormTextarea };
