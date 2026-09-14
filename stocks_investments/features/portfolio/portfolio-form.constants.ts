import { PORTFOLIO_NAME_MAX_LENGTH } from "@/domain/portfolio/portfolio.constants";

// Only stops runaway pastes; the real limit is validated with a message. Doubled because the
// input's maxLength counts UTF-16 units, where an emoji takes 2.
export const PORTFOLIO_NAME_INPUT_MAX_LENGTH = PORTFOLIO_NAME_MAX_LENGTH * 2;
