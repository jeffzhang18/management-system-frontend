import { AutoComplete, Input } from "antd";
import { useState } from "react";

const EMAIL_DOMAINS = ["gmail.com", "outlook.com", "126.com", "163.com", "qq.com"];

type EmailOption = { label: string; value: string };

interface EmailInputProps {
	value?: string;
	onChange?: (value: string) => void;
	onBlur?: () => void;
	disabled?: boolean;
	placeholder?: string;
}

export function EmailInput({ value, onChange, onBlur, disabled, placeholder }: EmailInputProps) {
	const [options, setOptions] = useState<EmailOption[]>([]);

	const handleSearch = (keyword: string) => {
		if (!keyword || keyword.includes("@")) {
			setOptions([]);
			return;
		}
		setOptions(EMAIL_DOMAINS.map((domain) => ({ label: `${keyword}@${domain}`, value: `${keyword}@${domain}` })));
	};

	return (
		<AutoComplete
			className="w-full"
			disabled={disabled}
			options={options}
			onSearch={handleSearch}
			value={value}
			onChange={(next) => onChange?.(next ?? "")}
			onBlur={onBlur}
		>
			<Input allowClear placeholder={placeholder} autoComplete="email" />
		</AutoComplete>
	);
}
