--cloud-pinyin user config

set_switch{
	default_chinese_mode = true,
	default_offline_mode = false,
	default_traditional_mode = false,
	double_pinyin = true,
	background_request = true,
	show_raw_in_auxiliary = true,
	always_show_candidates = true,
	show_pinyin_auxiliary = true,
}

set_punctuation('_', "——")

register_engine("Sogou", "")
